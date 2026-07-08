import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { extractColors, type ExtractedColor } from './src/lib/extractColors';
import { makeThumbnail } from './src/lib/thumbnail';
import { loadShots, saveShots, type Shot } from './src/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { familyOf, FAMILIES } from './src/lib/colorGroups';
import { ColorCard, type CollectedColor } from './src/components/ColorCard';
import './global.css';

cssInterop(LinearGradient, { className: 'style' });

/** "#RGB" / "#RRGGBB" / 접두사 없는 형태 모두 허용. 유효하지 않으면 null */
function parseHex(input: string): { r: number; g: number; b: number } | null {
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

function toHex(rgb: { r: number; g: number; b: number }): string {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map((v) => v.toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
}

const TOUCH = 40; // dot 터치 영역
const DOT_OPEN = 22;
const DOT_PICKED = 28;

type Screen = 'home' | 'picking' | 'collection';

export default function App() {
  const [view, setView] = useState<Screen>('home');
  const [shots, setShots] = useState<Shot[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [hexInput, setHexInput] = useState('');

  // 줍기 화면 상태
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [aspect, setAspect] = useState(0.8);
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [collected, setCollected] = useState<ExtractedColor[]>([]);
  const [lastPicked, setLastPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadShots().then(setShots);
  }, []);

  // 모든 샷의 색을 낱개로 펼쳐 최신순 정렬 — 카드 하나 = 주운 색 하나
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
    const counts = new Map<string, number>();
    for (const c of collectedColors) {
      const key = familyOf(c.rgb).key;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const fams = [...counts.entries()]
      .map(([key, count]) => ({ key, label: FAMILIES[key].label, count }))
      .sort((a, b) => FAMILIES[a.key].order - FAMILIES[b.key].order);
    return [
      { key: 'all', label: '전체', count: collectedColors.length },
      ...fams,
    ];
  }, [collectedColors]);

  const previewRgb = parseHex(hexInput);
  const activeFilter = tabs.some((t) => t.key === filter) ? filter : 'all';
  const visibleColors = useMemo(
    () =>
      activeFilter === 'all'
        ? collectedColors
        : collectedColors.filter((c) => familyOf(c.rgb).key === activeFilter),
    [collectedColors, activeFilter],
  );

  const resetPicking = () => {
    setImageUri(null);
    setColors([]);
    setCollected([]);
    setLastPicked(null);
  };

  const addHex = async () => {
    const rgb = parseHex(hexInput);
    if (!rgb) {
      Alert.alert('색상 코드를 확인해주세요', '예: #4C6A2B 또는 4C6A2B');
      return;
    }
    const shot: Shot = {
      id: String(Date.now()),
      createdAt: Date.now(),
      colors: [{ hex: toHex(rgb), rgb }],
    };
    const next = [shot, ...shots];
    setShots(next);
    await saveShots(next);
    setHexInput('');
    setFilter('all');
  };

  const handleImage = async (uri: string, w: number, h: number) => {
    setImageUri(uri);
    setAspect(w && h ? w / h : 0.8);
    setColors([]);
    setCollected([]);
    setLastPicked(null);
    setView('picking');
    setLoading(true);
    try {
      const palette = await extractColors(uri);
      setColors(palette);
    } catch (e) {
      Alert.alert('색상 추출 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('권한 필요', '카메라 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) {
      const a = result.assets[0];
      await handleImage(a.uri, a.width, a.height);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 1,
    });
    if (!result.canceled) {
      const a = result.assets[0];
      await handleImage(a.uri, a.width, a.height);
    }
  };

  const toggle = (color: ExtractedColor) => {
    const isPicked = collected.some((c) => c.hex === color.hex);
    if (isPicked) {
      setCollected((prev) => prev.filter((c) => c.hex !== color.hex));
      setLastPicked((prev) => (prev === color.hex ? null : prev));
    } else {
      setCollected((prev) => [...prev, color]);
      setLastPicked(color.hex);
    }
  };

  const done = async () => {
    if (collected.length === 0) {
      Alert.alert('아직 주운 색이 없어요', '마음에 드는 점을 톡 눌러보세요.');
      return;
    }
    if (!imageUri) return;
    setSaving(true);
    try {
      const thumb = await makeThumbnail(imageUri);
      const shot: Shot = {
        id: String(Date.now()),
        thumb,
        createdAt: Date.now(),
        colors: collected.map((c) => ({ hex: c.hex, rgb: c.rgb })),
      };
      const next = [shot, ...shots];
      setShots(next);
      await saveShots(next);
      resetPicking();
      setView('collection');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── 보관함 ────────────────────────────────────────────────
  if (view === 'collection') {
    return (
      <View className="flex-1 bg-[#0a0a0d]">
        <StatusBar style="light" />
        <LinearGradient
          colors={['#1b1b22', '#0a0a0d']}
          locations={[0, 0.55]}
          className="absolute inset-x-0 top-0 h-96"
        />

        {/* 헤더 */}
        <View className="flex-row items-center gap-2.5 px-4 pb-2 pt-16">
          <Pressable onPress={() => setView('home')} className="active:opacity-60">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View className="h-[52px] flex-1 flex-row items-center rounded-[26px] bg-[#141418] px-3.5">
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
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={7}
              className="h-full flex-1 text-[14px] text-white"
            />
            {hexInput.length > 0 ? (
              <Pressable onPress={addHex} className="pl-2 active:opacity-60">
                <Ionicons name="arrow-up-circle" size={26} color="#fff" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={takePhoto}
            className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#141418] active:opacity-80"
          >
            <Ionicons name="camera-outline" size={22} color="#fff" />
          </Pressable>
        </View>

        {collectedColors.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="color-palette-outline" size={44} color="#3a3a42" />
            <Text className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              아직 모은 색이 없어요
            </Text>
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
                const tint = active ? '#ffffff' : 'rgb(90,90,99)';
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
                        opacity: active ? 0.9 : 1,
                      }}
                    >
                      {t.count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView contentContainerClassName="px-[18px] pb-12 pt-3">
              <View className="flex-row flex-wrap justify-between">
                {visibleColors.map((c) => (
                  <ColorCard key={c.id} entry={c} />
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </View>
    );
  }

  // ── 홈(빈 상태) ───────────────────────────────────────────
  if (view === 'home') {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a0a0d] px-8">
        <StatusBar style="light" />
        <LinearGradient
          colors={['#1b1b22', '#0a0a0d']}
          locations={[0, 0.55]}
          className="absolute inset-0"
        />
        <Text className="text-[32px] font-extrabold tracking-tight text-white">
          ColorShot
        </Text>
        <Text
          className="mt-2 text-center text-[15px]"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          오늘 눈에 들어온 색을 주워보세요
        </Text>

        <LinearGradient
          colors={['#8FB0E6', '#C9A3D8']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          className="mt-12 h-40 w-40 items-center justify-center rounded-[36px]"
        >
          <View
            className="h-20 w-20 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
          />
        </LinearGradient>

        <Pressable
          className="mt-12 h-14 flex-row items-center gap-2 rounded-full bg-white px-8 active:opacity-80"
          onPress={takePhoto}
        >
          <Ionicons name="camera-outline" size={22} color="#0a0a0d" />
          <Text className="text-base font-semibold text-[#0a0a0d]">
            촬영해서 줍기
          </Text>
        </Pressable>
        <Pressable className="mt-4 active:opacity-60" onPress={pickImage}>
          <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            갤러리에서 불러오기
          </Text>
        </Pressable>

        {shots.length > 0 ? (
          <Pressable
            className="mt-10 flex-row items-center gap-2 active:opacity-60"
            onPress={() => setView('collection')}
          >
            <View className="flex-row">
              {shots.slice(0, 4).map((s, i) => {
                const style = {
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  marginLeft: i === 0 ? 0 : -8,
                  borderWidth: 2,
                  borderColor: '#0a0a0d',
                } as const;
                return s.thumb ? (
                  <Image key={s.id} source={{ uri: s.thumb }} style={style} />
                ) : (
                  <View
                    key={s.id}
                    style={{
                      ...style,
                      backgroundColor: s.colors[0]?.hex ?? '#888',
                    }}
                  />
                );
              })}
            </View>
            <Text
              className="text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              내가 모은 색 보기
            </Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
          </Pressable>
        ) : null}
      </View>
    );
  }

  // ── 줍기 화면 ──────────────────────────────────────────────
  return (
    <View className="flex-1 bg-[#0a0a0d]">
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1b1b22', '#0a0a0d']}
        locations={[0, 0.55]}
        className="absolute inset-x-0 top-0 h-96"
      />

      <View className="flex-row items-center justify-between px-5 pb-3 pt-16">
        <Pressable onPress={() => { resetPicking(); setView('home'); }} className="active:opacity-60">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text className="text-[15px] font-semibold text-white">색 줍기</Text>
        <Pressable onPress={() => { resetPicking(); setView('home'); }} className="active:opacity-60">
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>

      <View className="px-4">
        <View
          className="overflow-hidden rounded-3xl bg-[#141418]"
          style={{ aspectRatio: aspect, width: '100%' }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}

          {colors.map((c) => {
            const picked = collected.some((x) => x.hex === c.hex);
            const size = picked ? DOT_PICKED : DOT_OPEN;
            return (
              <Pressable
                key={c.hex}
                onPress={() => toggle(c)}
                style={{
                  position: 'absolute',
                  left: `${c.position.x * 100}%`,
                  top: `${c.position.y * 100}%`,
                  width: TOUCH,
                  height: TOUCH,
                  marginLeft: -TOUCH / 2,
                  marginTop: -TOUCH / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {lastPicked === c.hex ? (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: TOUCH - 6,
                      left: (TOUCH - 68) / 2,
                      width: 68,
                      alignItems: 'center',
                      backgroundColor: '#1c1b19',
                      paddingVertical: 3,
                      borderRadius: 7,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ color: '#fff', fontSize: 11, letterSpacing: 0.3 }}
                    >
                      {c.hex}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 3,
                    borderColor: '#fff',
                    backgroundColor: c.hex,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOpacity: 0.18,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 2,
                  }}
                >
                  {picked ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          {loading ? (
            <View className="absolute inset-0 items-center justify-center bg-black/10">
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : null}
        </View>
      </View>

      <Text
        className="mt-3 text-center text-[13px]"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        점을 톡 눌러 마음에 든 색을 주우세요
      </Text>

      <View className="mt-auto px-5">
        <View className="flex-row items-center gap-2 pb-1">
          <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            주운 색
          </Text>
          <View className="flex-row">
            {collected.length > 0 ? (
              collected.slice(0, 6).map((c, i) => (
                <View
                  key={c.hex}
                  className="h-6 w-6 rounded-full border-2 border-[#0a0a0d]"
                  style={{ backgroundColor: c.hex, marginLeft: i === 0 ? 0 : -7 }}
                />
              ))
            ) : (
              <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                아직 없음
              </Text>
            )}
          </View>
          <Text
            className="ml-auto text-xs"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {collected.length}개
          </Text>
        </View>

        <View className="flex-row items-center justify-between pb-10 pt-3">
          <Pressable
            onPress={takePhoto}
            className="flex-row items-center gap-1.5 active:opacity-60"
          >
            <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.55)" />
            <Text className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              다시 찍기
            </Text>
          </Pressable>
          <Pressable
            onPress={done}
            disabled={saving}
            className="flex-row items-center gap-1.5 rounded-full bg-white px-6 py-3 active:opacity-80"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#0a0a0d" />
            ) : (
              <Ionicons name="checkmark" size={16} color="#0a0a0d" />
            )}
            <Text className="text-sm font-semibold text-[#0a0a0d]">
              {saving ? '저장 중' : '완료'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
