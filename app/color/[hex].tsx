import { useMemo } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { parseHex, isLight } from '../../src/lib/hex';
import { useShots } from '../../src/store/shots';

function monthDay(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ColorDetailScreen() {
  const { hex: hexParam } = useLocalSearchParams<{ hex: string }>();
  const hex = `#${String(hexParam).replace('#', '').toUpperCase()}`;
  const { shots } = useShots();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const occurrences = useMemo(() => {
    const list: { id: string; thumb?: string; createdAt: number }[] = [];
    for (const shot of shots) {
      if (shot.colors.some((c) => c.hex === hex)) {
        list.push({ id: shot.id, thumb: shot.thumb, createdAt: shot.createdAt });
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [shots, hex]);

  const rgb = parseHex(hex);
  const light = rgb ? isLight(rgb) : false;
  const onColor = light ? '#1c1b19' : '#ffffff';
  const onColorDim = light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';

  return (
    <View className="flex-1 bg-[#FBFAF6]">
      <StatusBar style={light ? 'dark' : 'light'} />

      {/* 색 그대로의 헤더 */}
      <View
        style={{ backgroundColor: hex, paddingTop: insets.top + 8 }}
        className="px-4 pb-6"
      >
        <Pressable onPress={() => router.back()} className="active:opacity-60" hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={onColor} />
        </Pressable>
        <View className="mt-4">
          <Text
            style={{ color: onColor, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 }}
          >
            {hex}
          </Text>
          <Text style={{ color: onColorDim, fontSize: 13, marginTop: 3 }}>
            {`${occurrences.length}번 주웠어요`}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-[18px] pb-16 pt-5">
        <View className="flex-row flex-wrap justify-between">
          {occurrences.map((o) => (
            <View key={o.id} className="mb-4 w-[31.5%]">
              {o.thumb ? (
                <Image
                  source={{ uri: o.thumb }}
                  className="aspect-square w-full rounded-2xl bg-neutral-200"
                  resizeMode="cover"
                />
              ) : (
                <View
                  className="aspect-square w-full rounded-2xl"
                  style={{ backgroundColor: hex }}
                />
              )}
              <Text className="mt-1.5 text-center text-[11px] text-neutral-400">
                {monthDay(o.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
