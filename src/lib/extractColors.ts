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

  // 각 버킷의 대표색(평균)
  const reps = buckets.map((bucket) => {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    for (const p of bucket) {
      sr += p[0];
      sg += p[1];
      sb += p[2];
    }
    const n = bucket.length;
    return {
      r: Math.round(sr / n),
      g: Math.round(sg / n),
      b: Math.round(sb / n),
    };
  });

  // median cut은 버킷을 균등 분할하므로, 실제 "어느 색이 더 많은지"를 알려면
  // 모든 픽셀을 가장 가까운 대표색에 다시 배정해 진짜 비율을 센다.
  const counts = new Array(reps.length).fill(0);
  const posX = new Array(reps.length).fill(0);
  const posY = new Array(reps.length).fill(0);
  for (const p of pixels) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < reps.length; i++) {
      const dr = p[0] - reps[i].r;
      const dg = p[1] - reps[i].g;
      const db = p[2] - reps[i].b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    counts[best] += 1;
    posX[best] += p[3];
    posY[best] += p[4];
  }

  const colors = reps
    .map((rep, i) => ({
      hex: rgbToHex(rep.r, rep.g, rep.b),
      rgb: { r: rep.r, g: rep.g, b: rep.b },
      population: counts[i] / totalPixels,
      position:
        counts[i] > 0
          ? { x: posX[i] / counts[i], y: posY[i] / counts[i] }
          : { x: 0.5, y: 0.5 },
    }))
    .filter((c) => c.population > 0);

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
