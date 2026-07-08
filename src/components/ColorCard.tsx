import { Image, Pressable, Text, View } from 'react-native';
import type { SavedColor } from '../lib/storage';

export interface CollectedColor extends SavedColor {
  id: string;
  createdAt: number;
  thumb?: string;
}

/** 배경색 위에서 글자가 읽히도록 밝기로 대비색을 고른다 */
function isLight(rgb: { r: number; g: number; b: number }): boolean {
  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  return luminance > 150;
}

function monthDay(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

interface Props {
  entry: CollectedColor;
  /** 같은 HEX를 주운 횟수 (2 이상이면 배지 표시) */
  count?: number;
  onPress?: () => void;
}

/** 주운 색 하나 = 그 색 그대로의 단색 카드. 누르면 그 색만 모인 앨범으로 */
export function ColorCard({ entry, count = 1, onPress }: Props) {
  const light = isLight(entry.rgb);
  const primary = light ? '#1c1b19' : '#ffffff';
  const secondary = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.72)';
  const thumbBorder = light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)';
  const badgeBg = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)';

  return (
    <Pressable
      className="mb-[13px] w-[48.5%] active:opacity-90"
      onPress={onPress}
    >
      <View
        className="overflow-hidden rounded-[26px] p-4"
        style={{ aspectRatio: 0.82, backgroundColor: entry.hex }}
      >
        {/* 우상단: 여러 번 주웠으면 개수 배지, 아니면 출처 썸네일 */}
        {count > 1 ? (
          <View
            className="absolute right-3 top-3 z-10 h-7 min-w-7 flex-row items-center justify-center rounded-full px-2"
            style={{ backgroundColor: badgeBg }}
          >
            <Text style={{ color: primary, fontSize: 12, fontWeight: '700' }}>
              {count}
            </Text>
          </View>
        ) : entry.thumb ? (
          <View className="absolute right-3 top-3 z-10">
            <Image
              source={{ uri: entry.thumb }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: thumbBorder,
              }}
            />
          </View>
        ) : null}

        {/* 라벨 */}
        <View className="mt-auto">
          <Text
            style={{
              color: primary,
              fontSize: 15,
              fontWeight: '600',
              letterSpacing: -0.2,
            }}
          >
            {entry.hex}
          </Text>
          <Text style={{ color: secondary, fontSize: 11.5, marginTop: 2 }}>
            {count > 1 ? `${count}번 주움` : monthDay(entry.createdAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
