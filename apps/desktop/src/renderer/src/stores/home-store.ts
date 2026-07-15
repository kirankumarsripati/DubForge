import type {
  AppInfo,
  AsyncState,
  Job,
  LocalizationLanguage,
  OutputOptions,
  RecentVideoFile,
  TranslationProfile,
  VideoImportError,
  VideoMetadata,
} from '@dubforge/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { appService, MOCK_LANGUAGES, pipelineService, videoService } from '../services';
import { isVideoImportError } from '../services/video-import-error';
import { VideoImportRejectedError } from '../services/ipc/video-import-result';

interface HomeStoreState {
  readonly appInfo: AsyncState<AppInfo>;
  readonly selectedVideo: VideoMetadata | null;
  readonly languages: readonly LocalizationLanguage[];
  readonly profile: TranslationProfile;
  readonly output: OutputOptions;
  readonly activeJob: Job | null;
  readonly isStarting: boolean;
  readonly startError: string | null;
  readonly isImporting: boolean;
  readonly importError: VideoImportError | null;
  readonly recentFiles: readonly RecentVideoFile[];
  fetchAppInfo: () => Promise<void>;
  selectVideo: () => Promise<void>;
  inspectDroppedFile: (file: File) => Promise<void>;
  openRecentFile: (id: string) => Promise<void>;
  clearVideo: () => void;
  clearImportError: () => void;
  toggleLanguage: (code: string) => void;
  setProfile: (profile: TranslationProfile) => void;
  setOutput: (output: Partial<OutputOptions>) => void;
  startLocalization: () => Promise<void>;
  fetchActiveJob: () => Promise<void>;
  fetchRecentFiles: () => Promise<void>;
}

const defaultOutput: OutputOptions = {
  generateTranslatedAudio: true,
  generateSubtitles: true,
  embedSubtitles: true,
  exportSrt: false,
  exportTranscript: true,
};

async function importVideo(
  importer: () => Promise<VideoMetadata | null>,
  set: (partial: Partial<HomeStoreState>) => void,
  get: () => HomeStoreState,
): Promise<void> {
  set({ isImporting: true, importError: null });

  try {
    const metadata = await importer();
    if (metadata === null) {
      set({ isImporting: false });
      return;
    }

    set({
      selectedVideo: metadata,
      isImporting: false,
      importError: null,
      startError: null,
    });
    await get().fetchRecentFiles();
  } catch (error) {
    set({
      isImporting: false,
      importError:
        error instanceof VideoImportRejectedError
          ? error.importError
          : isVideoImportError(error)
            ? error
            : {
                title: 'Import failed',
                description:
                  error instanceof Error ? error.message : 'The video could not be imported.',
                recoveryAction: 'Try selecting the file again.',
              },
    });
  }
}

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
      isImporting: false,
      importError: null,
      recentFiles: [],
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
      selectVideo: async () => {
        await importVideo(() => videoService.selectFile(), set, get);
      },
      inspectDroppedFile: async (file) => {
        const dubforgeApi = window.dubforge;
        if (dubforgeApi === undefined || !('files' in dubforgeApi)) {
          await importVideo(() => videoService.selectFile(), set, get);
          return;
        }

        const filePath = dubforgeApi.files.getPathForFile(file);
        await importVideo(() => videoService.inspectFile(filePath), set, get);
      },
      openRecentFile: async (id) => {
        await importVideo(() => videoService.openRecentFile(id), set, get);
      },
      clearVideo: () => {
        set({ selectedVideo: null, activeJob: null, startError: null, importError: null });
      },
      clearImportError: () => {
        set({ importError: null });
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
      fetchRecentFiles: async () => {
        const recentFiles = await videoService.listRecentFiles();
        set({ recentFiles });
      },
    }),
    { name: 'home-store' },
  ),
);
