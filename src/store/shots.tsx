import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadShots, saveShots, type Shot, type SavedColor } from '../lib/storage';

interface ShotsValue {
  shots: Shot[];
  ready: boolean;
  /** 새 기록 추가 (사진 썸네일은 선택) */
  addShot: (colors: SavedColor[], thumb?: string) => void;
}

const ShotsContext = createContext<ShotsValue | null>(null);

export function ShotsProvider({ children }: { children: ReactNode }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadShots().then((s) => {
      setShots(s);
      setReady(true);
    });
  }, []);

  // 변경될 때마다 저장 (최초 로드 완료 후에만)
  useEffect(() => {
    if (ready) saveShots(shots);
  }, [shots, ready]);

  const value = useMemo<ShotsValue>(
    () => ({
      shots,
      ready,
      addShot: (colors, thumb) =>
        setShots((prev) => [
          { id: String(Date.now()), createdAt: Date.now(), thumb, colors },
          ...prev,
        ]),
    }),
    [shots, ready],
  );

  return <ShotsContext.Provider value={value}>{children}</ShotsContext.Provider>;
}

export function useShots(): ShotsValue {
  const ctx = useContext(ShotsContext);
  if (!ctx) throw new Error('useShots must be used within ShotsProvider');
  return ctx;
}
