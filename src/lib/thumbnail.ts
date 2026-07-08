import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * 사진 URI를 받아 모아보기 그리드용 썸네일(base64 data URI)을 만든다.
 * async-storage에 그대로 저장해 재실행 후에도 남게 하기 위함.
 */
export async function makeThumbnail(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 600 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.6,
    base64: true,
  });
  return `data:image/jpeg;base64,${result.base64 ?? ''}`;
}
