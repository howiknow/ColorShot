export interface Family {
  key: string;
  label: string;
  order: number;
  /** 섹션 헤더에 찍는 대표 점 색 */
  dot: string;
}

export const FAMILIES: Record<string, Family> = {
  red: { key: 'red', label: '빨강', order: 1, dot: '#C0392B' },
  orange: { key: 'orange', label: '주황', order: 2, dot: '#D8743A' },
  yellow: { key: 'yellow', label: '노랑', order: 3, dot: '#E3B23C' },
  green: { key: 'green', label: '초록', order: 4, dot: '#6F8352' },
  mint: { key: 'mint', label: '민트', order: 5, dot: '#7FB3A6' },
  blue: { key: 'blue', label: '파랑', order: 6, dot: '#5B8AC0' },
  purple: { key: 'purple', label: '보라', order: 7, dot: '#8E7CC3' },
  pink: { key: 'pink', label: '분홍', order: 8, dot: '#D28AAE' },
  gray: { key: 'gray', label: '무채색', order: 9, dot: '#9A988F' },
};

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

/** RGB → 색 계열 판정 */
export function familyOf(rgb: { r: number; g: number; b: number }): Family {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  // 채도가 아주 낮거나 극단적으로 밝고/어두우면 무채색
  if (l < 0.1 || s < 0.1 || (l > 0.93 && s < 0.2)) return FAMILIES.gray;
  if (h < 15 || h >= 345) return FAMILIES.red;
  if (h < 40) return FAMILIES.orange;
  if (h < 65) return FAMILIES.yellow;
  if (h < 165) return FAMILIES.green;
  if (h < 200) return FAMILIES.mint;
  if (h < 255) return FAMILIES.blue;
  if (h < 290) return FAMILIES.purple;
  return FAMILIES.pink;
}

