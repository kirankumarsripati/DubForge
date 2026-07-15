import type {
  AppInfo,
  AsyncState,
  Job,
  LocalizationLanguage,
  OutputOptions,
  TranslationProfile,
  VideoMetadata,
} from '@dubforge/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MOCK_LANGUAGES, MOCK_SAMPLE_VIDEO, appService, pipelineService } from '../services';

interface HomeStoreState {
  readonly appInfo: AsyncState<AppInfo>;
  readonly selectedVideo: VideoMetadata | null;
  readonly languages: readonly LocalizationLanguage[];
  readonly profile: TranslationProfile;
  readonly output: OutputOptions;
  readonly activeJob: Job | null;
  readonly isStarting: boolean;
  readonly startError: string | null;
  fetchAppInfo: () => Promise<void>;
  selectVideo: () => void;
  clearVideo: () => void;
  toggleLanguage: (code: string) => void;
  setProfile: (profile: TranslationProfile) => void;
  setOutput: (output: Partial<OutputOptions>) => void;
  startLocalization: () => Promise<void>;
  fetchActiveJob: () => Promise<void>;
}

const defaultOutput: OutputOptions = {
  generateTranslatedAudio: true,
  generateSubtitles: true,
  embedSubtitles: true,
  exportSrt: false,
  exportTranscript: true,
};

export const useHomeStore = create<HomeStoreState>()(
  devtools(
    (set, get) => ({
      appInfo: { status: 'idle', data: null, error: null },
      selectedVideo: null,
      languages: MOCK_LANGUAGES,
      profile: 'balanced',
      output: defaultOutput,
      activeJob: null,
      isStarting: false,
      startError: null,
      fetchAppInfo: async () => {
        set({ appInfo: { status: 'loading', data: null, error: null } });
        try {
          const data = await appService.getAppInfo();
          set({ appInfo: { status: 'success', data, error: null } });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load app info';
          set({ appInfo: { status: 'error', data: null, error: message } });
        }
      },
      selectVideo: () => {
        set({ selectedVideo: MOCK_SAMPLE_VIDEO, startError: null });
      },
      clearVideo: () => {
        set({ selectedVideo: null, activeJob: null, startError: null });
      },
      toggleLanguage: (code) => {
        set({
          languages: get().languages.map((lang) =>
            lang.code === code ? { ...lang, enabled: !lang.enabled } : lang,
          ),
        });
      },
      setProfile: (profile) => {
        set({ profile });
      },
      setOutput: (partial) => {
        set({ output: { ...get().output, ...partial } });
      },
      startLocalization: async () => {
        const video = get().selectedVideo;
        if (!video) {
          return;
        }
        const enabledLanguages = get()
          .languages.filter((lang) => lang.enabled)
          .map((lang) => lang.code);

        set({ isStarting: true, startError: null });
        try {
          const job = await pipelineService.startJob({
            video,
            languages: enabledLanguages,
            profile: get().profile,
            output: get().output,
          });
          set({ activeJob: job, isStarting: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to start localization';
          set({ isStarting: false, startError: message });
        }
      },
      fetchActiveJob: async () => {
        const job = await pipelineService.getActiveJob();
        set({ activeJob: job });
      },
    }),
    { name: 'home-store' },
  ),
);
