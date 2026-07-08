import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { ShotsProvider } from '../src/store/shots';
import '../global.css';

// LinearGradient에서 className을 쓸 수 있게 등록 (앱 전체 1회)
cssInterop(LinearGradient, { className: 'style' });

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ShotsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="color/[hex]" />
        </Stack>
      </ShotsProvider>
    </SafeAreaProvider>
  );
}
