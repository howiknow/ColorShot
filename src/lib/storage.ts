import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

/** 한 번의 색 줍기 결과 — 사진 썸네일(직접 입력 시 없음) + 그때 주운 색들 */
export interface Shot {
  id: string;
  /** data:image/jpeg;base64,... 형태의 썸네일. HEX 직접 입력으로 모은 색은 없음 */
  thumb?: string;
  createdAt: number;
  colors: SavedColor[];
}

const KEY = 'colorshot.shots.v1';

export async function loadShots(): Promise<Shot[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Shot[]) : [];
  } catch {
    return [];
  }
}

export async function saveShots(shots: Shot[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(shots));
}
