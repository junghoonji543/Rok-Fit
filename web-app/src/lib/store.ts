import { create } from 'zustand';
import { ExerciseMode } from './exerciseCounter';

interface AppState {
    mode: ExerciseMode;
    status: 'idle' | 'analyzing' | 'encoding' | 'completed';
    progress: number;
    progressPhase: string;
    resultUrl: string | null;
    originalFile: File | null;

    setMode: (m: ExerciseMode) => void;
    setStatus: (s: AppState['status']) => void;
    setProgress: (phase: string, p: number) => void;
    setResult: (url: string) => void;
    setFile: (f: File) => void;
    reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    mode: 'pushup',
    status: 'idle',
    progress: 0,
    progressPhase: '',
    resultUrl: null,
    originalFile: null,

    setMode: (m) => set({ mode: m }),
    setStatus: (s) => set({ status: s }),
    setProgress: (phase, p) => set({ progressPhase: phase, progress: p }),
    setResult: (url) => set({ resultUrl: url, status: 'completed' }),
    setFile: (f) => set({ originalFile: f }),
    reset: () => set({ status: 'idle', progress: 0, resultUrl: null, originalFile: null })
}));
