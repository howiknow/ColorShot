import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as base64js from 'base64-js';
import jpeg from 'jpeg-js';

export interface ExtractedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  /** 0~1, 이 색이 이미지에서 차지하는 비율 */
  population: number;
  /** 0~1, 이 색이 이미지에서 나온 대표 위치 (dot을 얹을 좌표) */
  position: { x: number; y: number };
}

const SAMPLE_SIZE = 64;

/**
 * 이미지 URI를 받아 대표 색상 팔레트를 추출한다.
 * 이미지를 64px로 축소 → JPEG 디코딩 → median cut으로 색상 분류.
 * 각 색이 이미지의 어디에서 나왔는지(centroid)도 함께 계산한다.
 */
export async function extractColors(
  imageUri: string,
  colorCount = 6,
): Promise<ExtractedColor[]> {
  const context = ImageManipulator.manipulate(imageUri);
  context.resize({ width: SAMPLE_SIZE });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 1,
    base64: true,
  });

  if (!result.base64) {
    throw new Error('이미지를 base64로 변환하지 못했습니다.');
  }

  const jpegBytes = base64js.toByteArray(result.base64);
  const { data, width, height } = jpeg.decode(jpegBytes, { useTArray: true });

  const pixels: Pixel[] = [];
  for (let i = 0; i < width * height; i++) {
    const x = (i % width) / width;
    const y = Math.floor(i / width) / height;
    pixels.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2], x, y]);
  }

  return medianCut(pixels, colorCount);
}

/** [r, g, b, x, y] — x, y는 0~1로 정규화된 이미지 내 위치 */
type Pixel = [number, number, number, number, number];

function medianCut(pixels: Pixel[], colorCount: number): ExtractedColor[] {
  let buckets: Pixel[][] = [pixels];

  while (buckets.length < colorCount) {
    // 가장 색 범위가 넓은 버킷을 골라 반으로 쪼갠다
    let widestBucket = -1;
    let widestRange = -1;
    let widestChannel = 0;

    buckets.forEach((bucket, i) => {
      if (bucket.length < 2) return;
      const { range, channel } = widestChannelOf(bucket);
      if (range > widestRange) {
        widestRange = range;
        widestChannel = channel;
        widestBucket = i;
      }
    });

    if (widestBucket === -1) break; // 더 쪼갤 버킷이 없음

    const bucket = buckets[widestBucket];
    bucket.sort((a, b) => a[widestChannel] - b[widestChannel]);
    const mid = Math.floor(bucket.length / 2);
    buckets.splice(widestBucket, 1, bucket.slice(0, mid), bucket.slice(mid));
  }

  const totalPixels = pixels.length;
  const colors = buckets.map((bucket) => {
    const sum = bucket.reduce(
      (acc, p) => [
        acc[0] + p[0],
        acc[1] + p[1],
        acc[2] + p[2],
        acc[3] + p[3],
        acc[4] + p[4],
      ],
      [0, 0, 0, 0, 0],
    );
    const n = bucket.length;
    const r = Math.round(sum[0] / n);
    const g = Math.round(sum[1] / n);
    const b = Math.round(sum[2] / n);
    return {
      hex: rgbToHex(r, g, b),
      rgb: { r, g, b },
      population: n / totalPixels,
      position: { x: sum[3] / n, y: sum[4] / n },
    };
  });

  // 단색 영역이 크면 같은 색이 여러 버킷으로 나올 수 있어 hex 기준으로 병합
  const merged = new Map<string, ExtractedColor>();
  for (const color of colors) {
    const existing = merged.get(color.hex);
    if (existing) {
      const wa = existing.population;
      const wb = color.population;
      const total = wa + wb;
      existing.position = {
        x: (existing.position.x * wa + color.position.x * wb) / total,
        y: (existing.position.y * wa + color.position.y * wb) / total,
      };
      existing.population = total;
    } else {
      merged.set(color.hex, { ...color });
    }
  }

  return [...merged.values()].sort((a, b) => b.population - a.population);
}

function widestChannelOf(bucket: Pixel[]): { range: number; channel: number } {
  const min = [255, 255, 255];
  const max = [0, 0, 0];
  for (const p of bucket) {
    for (let c = 0; c < 3; c++) {
      if (p[c] < min[c]) min[c] = p[c];
      if (p[c] > max[c]) max[c] = p[c];
    }
  }
  const ranges = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const channel = ranges.indexOf(Math.max(...ranges));
  return { range: ranges[channel], channel };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')
  );
}
