import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { extractColors, type ExtractedColor } from '../../src/lib/extractColors';
import { makeThumbnail } from '../../src/lib/thumbnail';
import { useShots } from '../../src/store/shots';

export default function PickScreen() {
  const { addShot } = useShots();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [selectedHexes, setSelectedHexes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const reset = () => {
    setImageUri(null);
    setColors([]);
    setSelectedHexes([]);
    sheetAnim.setValue(0);
  };

  const handleImage = async (uri: string) => {
    setImageUri(uri);
    setColors([]);
    setSelectedHexes([]);
    sheetAnim.setValue(0);
    setLoading(true);
    try {
      const palette = await extractColors(uri);
      setColors(palette);
      if (palette.length > 0) setSelectedHexes([palette[0].hex]);
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
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
    if (!result.canceled) await handleImage(result.assets[0].uri);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 1,
    });
    if (!result.canceled) await handleImage(result.assets[0].uri);
  };

  const toggleHex = (hex: string) =>
    setSelectedHexes((prev) =>
      prev.includes(hex) ? prev.filter((h) => h !== hex) : [...prev, hex],
    );

  const save = async () => {
    if (selectedHexes.length === 0) {
      Alert.alert('색을 하나 이상 골라주세요');
      return;
    }
    if (!imageUri) return;
    setSaving(true);
    try {
      const thumb = await makeThumbnail(imageUri);
      const picked = colors
        .filter((c) => selectedHexes.includes(c.hex))
        .map((c) => ({ hex: c.hex, rgb: c.rgb }));
      addShot(picked, thumb);
      reset();
      router.navigate('/');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // 사진 선택 전: 진입 화면
  if (!imageUri) {
    return (
      <View
        className="flex-1 items-center justify-center bg-[#FBFAF6] px-8"
        style={{ paddingTop: insets.top }}
      >
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#8FB0E6', '#C9A3D8']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          className="h-36 w-36 items-center justify-center rounded-[34px]"
        >
          <Ionicons name="color-wand-outline" size={44} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
        <Text className="mt-8 text-[20px] font-bold text-[#26241F]">
          오늘 눈에 들어온 색
        </Text>
        <Text className="mt-1.5 text-center text-[14px] text-neutral-400">
          사진을 고르면 가장 많은 색을 찾아드려요
        </Text>

        <Pressable
          onPress={takePhoto}
          className="mt-10 h-14 w-full flex-row items-center justify-center gap-2 rounded-full bg-[#26241F] active:opacity-80"
        >
          <Ionicons name="camera-outline" size={22} color="#fff" />
          <Text className="text-base font-semibold text-white">촬영해서 줍기</Text>
        </Pressable>
        <Pressable
          onPress={pickImage}
          className="mt-3 h-14 w-full flex-row items-center justify-center gap-2 rounded-full border border-neutral-200 active:bg-neutral-100"
        >
          <Ionicons name="images-outline" size={20} color="#6b675e" />
          <Text className="text-base font-medium text-neutral-600">
            갤러리에서 불러오기
          </Text>
        </Pressable>
      </View>
    );
  }

  const dominant = colors[0];
  return (
    <View className="flex-1 bg-[#FBFAF6]" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
        <Pressable onPress={reset} className="active:opacity-60">
          <Ionicons name="chevron-back" size={24} color="#26241F" />
        </Pressable>
        <Text className="text-[15px] font-semibold text-[#26241F]">색 줍기</Text>
        <Pressable onPress={reset} className="active:opacity-60">
          <Ionicons name="close" size={22} color="#b8b4aa" />
        </Pressable>
      </View>

      <View className="flex-1 px-5 pt-2 pb-4">
        <View className="flex-1 overflow-hidden rounded-3xl bg-neutral-200">
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          {loading ? (
            <View className="absolute inset-0 items-center justify-center bg-black/20">
              <ActivityIndicator size="large" color="#fff" />
              <Text className="mt-3 text-sm text-white">색을 분석하고 있어요…</Text>
            </View>
          ) : null}
        </View>
      </View>

      {dominant && !loading ? (
        <Animated.View
          style={{
            opacity: sheetAnim,
            transform: [
              {
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [340, 0],
                }),
              },
            ],
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: -6 },
          }}
          className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-6 pb-11 pt-3"
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-neutral-200" />
          <Text className="text-[13px] text-neutral-400">
            사진에서 가장 많이 담긴 색이에요
          </Text>
          <View className="mt-3 flex-row items-center gap-3.5">
            <View
              className="h-16 w-16 rounded-2xl"
              style={{ backgroundColor: dominant.hex }}
            />
            <View className="flex-1">
              <Text className="text-[22px] font-bold tracking-tight text-[#26241F]">
                {dominant.hex}
              </Text>
              <Text className="mt-0.5 text-[13px] text-neutral-400">
                {selectedHexes.length > 1
                  ? `이 색 포함 ${selectedHexes.length}개를 저장할게요`
                  : '이 색으로 저장할게요'}
              </Text>
            </View>
          </View>

          <Text className="mb-2 mt-6 text-[12px] font-medium text-neutral-400">
            함께 담을 색 고르기
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3.5 pr-2"
          >
            {colors.map((c) => {
              const on = selectedHexes.includes(c.hex);
              return (
                <Pressable
                  key={c.hex}
                  onPress={() => toggleHex(c.hex)}
                  className="items-center active:opacity-70"
                >
                  <View
                    className="h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: c.hex,
                      borderWidth: on ? 3 : 1,
                      borderColor: on ? '#26241F' : 'rgba(0,0,0,0.08)',
                    }}
                  >
                    {on ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                  </View>
                  <Text className="mt-1 text-[10px] text-neutral-400">
                    {Math.round(c.population * 100)}%
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="mt-6 flex-row items-center gap-3">
            <Pressable
              onPress={pickImage}
              className="h-14 flex-row items-center justify-center gap-1.5 rounded-full border border-neutral-200 px-6 active:bg-neutral-100"
            >
              <Ionicons name="refresh" size={17} color="#6b675e" />
              <Text className="text-[14px] font-medium text-neutral-600">다시</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-[#26241F] active:opacity-80"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={18} color="#fff" />
              )}
              <Text className="text-[15px] font-semibold text-white">
                {saving ? '저장 중' : '저장할게요'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
