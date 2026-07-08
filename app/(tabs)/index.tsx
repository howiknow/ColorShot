import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { familyOf, FAMILIES } from '../../src/lib/colorGroups';
import { parseHex, toHex } from '../../src/lib/hex';
import { useShots } from '../../src/store/shots';
import {
  ColorCard,
  type CollectedColor,
} from '../../src/components/ColorCard';

export default function CollectionScreen() {
  const { shots, addShot } = useShots();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [hexInput, setHexInput] = useState('');

  const collectedColors = useMemo<CollectedColor[]>(() => {
    const list: CollectedColor[] = [];
    for (const shot of shots) {
      shot.colors.forEach((c, i) => {
        list.push({
          ...c,
          id: `${shot.id}-${i}`,
          createdAt: shot.createdAt,
          thumb: shot.thumb,
        });
      });
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [shots]);

  const tabs = useMemo(() => {
    const familyHexes = new Map<string, Set<string>>();
    const allHexes = new Set<string>();
    for (const c of collectedColors) {
      allHexes.add(c.hex);
      const key = familyOf(c.rgb).key;
      if (!familyHexes.has(key)) familyHexes.set(key, new Set());
      familyHexes.get(key)!.add(c.hex);
    }
    const fams = [...familyHexes.entries()]
      .map(([key, set]) => ({ key, label: FAMILIES[key].label, count: set.size }))
      .sort((a, b) => FAMILIES[a.key].order - FAMILIES[b.key].order);
    return [{ key: 'all', label: '전체', count: allHexes.size }, ...fams];
  }, [collectedColors]);

  const previewRgb = parseHex(hexInput);
  const activeFilter = tabs.some((t) => t.key === filter) ? filter : 'all';

  const hexCards = useMemo(() => {
    const filtered =
      activeFilter === 'all'
        ? collectedColors
        : collectedColors.filter((c) => familyOf(c.rgb).key === activeFilter);
    const map = new Map<string, CollectedColor & { count: number }>();
    for (const c of filtered) {
      const g = map.get(c.hex);
      if (g) {
        g.count += 1;
        if (c.createdAt > g.createdAt) {
          g.createdAt = c.createdAt;
          g.thumb = c.thumb;
        }
      } else {
        map.set(c.hex, { ...c, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
  }, [collectedColors, activeFilter]);

  const addHex = () => {
    const rgb = parseHex(hexInput);
    if (!rgb) {
      Alert.alert('색상 코드를 확인해주세요', '예: #4C6A2B 또는 4C6A2B');
      return;
    }
    addShot([{ hex: toHex(rgb), rgb }]);
    setHexInput('');
    setFilter('all');
  };

  const openColor = (hex: string) =>
    router.push(`/color/${hex.replace('#', '')}`);

  return (
    <View className="flex-1 bg-[#FBFAF6]" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* 헤더 (HEX 직접 입력) */}
      <View className="flex-row items-center gap-2.5 px-4 pb-2 pt-3">
        <View className="h-[52px] flex-1 flex-row items-center rounded-[26px] bg-white px-3.5 shadow-sm shadow-black/5">
          {previewRgb ? (
            <View
              className="mr-2.5 h-7 w-7 rounded-full"
              style={{ backgroundColor: toHex(previewRgb) }}
            />
          ) : (
            <LinearGradient
              colors={['#8FB0E6', '#C9A3D8']}
              className="mr-2.5 h-7 w-7 rounded-full"
            />
          )}
          <TextInput
            value={hexInput}
            onChangeText={setHexInput}
            onSubmitEditing={addHex}
            placeholder="색상 코드 입력 · 예: 4C6A2B"
            placeholderTextColor="rgba(0,0,0,0.35)"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={7}
            className="h-full flex-1 text-[14px] text-[#26241F]"
          />
          {hexInput.length > 0 ? (
            <Pressable onPress={addHex} className="pl-2 active:opacity-60">
              <Ionicons name="arrow-up-circle" size={26} color="#26241F" />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.navigate('/pick')}
          className="h-[52px] w-[52px] items-center justify-center rounded-full bg-white shadow-sm shadow-black/5 active:opacity-80"
        >
          <Ionicons name="camera-outline" size={22} color="#26241F" />
        </Pressable>
      </View>

      {collectedColors.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="color-palette-outline" size={44} color="#d8d4c8" />
          <Text className="mt-3 text-sm text-neutral-400">
            아직 모은 색이 없어요
          </Text>
          <Pressable
            onPress={() => router.navigate('/pick')}
            className="mt-5 rounded-full bg-[#26241F] px-6 py-3 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-white">색 주우러 가기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-[22px] gap-[22px] items-center"
            className="grow-0"
            style={{ height: 60 }}
          >
            {tabs.map((t) => {
              const active = activeFilter === t.key;
              const tint = active ? '#26241F' : '#c4c0b6';
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setFilter(t.key)}
                  className="flex-row items-start active:opacity-60"
                >
                  <Text
                    style={{
                      color: tint,
                      fontSize: 23,
                      lineHeight: 30,
                      fontWeight: '600',
                      letterSpacing: -0.4,
                    }}
                  >
                    {t.label}
                  </Text>
                  <Text
                    style={{
                      color: tint,
                      fontSize: 11,
                      fontWeight: '600',
                      marginLeft: 4,
                      marginTop: 2,
                    }}
                  >
                    {t.count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView contentContainerClassName="px-[18px] pb-8 pt-3">
            <View className="flex-row flex-wrap justify-between">
              {hexCards.map((c) => (
                <ColorCard
                  key={c.hex}
                  entry={c}
                  count={c.count}
                  onPress={() => openColor(c.hex)}
                />
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}
