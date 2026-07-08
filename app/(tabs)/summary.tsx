import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { familyOf, FAMILIES } from '../../src/lib/colorGroups';
import { useShots } from '../../src/store/shots';

export default function SummaryScreen() {
  const { shots } = useShots();
  const insets = useSafeAreaInsets();

  const { totalColors, totalShots, families } = useMemo(() => {
    const hexes = new Set<string>();
    const famCount = new Map<string, number>();
    for (const shot of shots) {
      for (const c of shot.colors) {
        hexes.add(c.hex);
        const key = familyOf(c.rgb).key;
        famCount.set(key, (famCount.get(key) ?? 0) + 1);
      }
    }
    const families = [...famCount.entries()]
      .map(([key, count]) => ({ ...FAMILIES[key], count }))
      .sort((a, b) => b.count - a.count);
    return {
      totalColors: hexes.size,
      totalShots: shots.length,
      families,
    };
  }, [shots]);

  const maxCount = families[0]?.count ?? 1;

  return (
    <View className="flex-1 bg-[#FBFAF6]" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-6 pb-8 pt-4">
        <Text className="text-[28px] font-extrabold tracking-tight text-[#26241F]">
          내 색 요약
        </Text>

        {/* 통계 카드 */}
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1 rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
            <Text className="text-[32px] font-bold text-[#26241F]">
              {totalColors}
            </Text>
            <Text className="mt-1 text-[13px] text-neutral-400">모은 색</Text>
          </View>
          <View className="flex-1 rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
            <Text className="text-[32px] font-bold text-[#26241F]">
              {totalShots}
            </Text>
            <Text className="mt-1 text-[13px] text-neutral-400">기록 수</Text>
          </View>
        </View>

        {/* 색 계열 분포 */}
        <Text className="mb-3 mt-8 text-[15px] font-semibold text-[#26241F]">
          색 계열 분포
        </Text>
        {families.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="stats-chart-outline" size={40} color="#d8d4c8" />
            <Text className="mt-3 text-sm text-neutral-400">
              아직 데이터가 없어요
            </Text>
          </View>
        ) : (
          families.map((f) => (
            <View key={f.key} className="mb-3.5 flex-row items-center gap-3">
              <View
                style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: f.dot }}
              />
              <Text className="w-14 text-[13px] text-neutral-600">{f.label}</Text>
              <View className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <View
                  style={{
                    width: `${(f.count / maxCount) * 100}%`,
                    height: '100%',
                    backgroundColor: f.dot,
                    borderRadius: 999,
                  }}
                />
              </View>
              <Text className="w-6 text-right text-[12px] text-neutral-400">
                {f.count}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
