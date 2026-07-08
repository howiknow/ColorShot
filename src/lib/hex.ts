export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** "#RGB" / "#RRGGBB" / 접두사 없는 형태 모두 허용. 유효하지 않으면 null */
export function parseHex(input: string): Rgb | null {
  let s = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    s = s
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toHex(rgb: Rgb): string {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map((v) => v.toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
}

/** 배경색 위 텍스트 대비를 위한 밝기 판정 */
export function isLight(rgb: Rgb): boolean {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b > 150;
}
