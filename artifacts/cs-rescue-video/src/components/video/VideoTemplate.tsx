import { useEffect, useRef, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

export const SCENE_DURATIONS = {
  opening: 9000,
  executive_summary: 8500,
  customer_journey: 8500,
  operational_intelligence: 8500,
  value_creation: 9000,
  outro: 8000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  opening: Scene1,
  executive_summary: Scene2,
  customer_journey: Scene3,
  operational_intelligence: Scene4,
  value_creation: Scene5,
  outro: Scene6,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0B0F19] font-body text-white">

      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0 opacity-40">
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px] bg-blue-500/20 mix-blend-screen"
          animate={{
            x: ['-20%', '10%', '-10%', '30%', '-20%', '10%'][sceneIndex] || '0%',
            y: ['-10%', '-30%', '20%', '-10%', '10%', '-20%'][sceneIndex] || '0%',
            scale: [1, 1.2, 0.9, 1.1, 1, 1.3][sceneIndex] || 1,
          }}
          transition={{ duration: 4, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 bottom-0 w-[60vw] h-[60vw] rounded-full blur-[100px] bg-emerald-500/10 mix-blend-screen"
          animate={{
            x: ['20%', '-10%', '10%', '-30%', '20%', '-10%'][sceneIndex] || '0%',
            y: ['20%', '10%', '-20%', '30%', '-10%', '20%'][sceneIndex] || '0%',
          }}
          transition={{ duration: 5, ease: 'easeInOut' }}
        />
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`, backgroundSize: '4vw 4vw' }}
      />

      {/* Scene Content */}
      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
