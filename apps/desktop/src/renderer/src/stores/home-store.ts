import type {
  JobDefinition,
  JobEstimation,
  JobPreset,
  JobValidationResult,
} from '@dubforge/job-config';
import type {
  AppInfo,
  AsyncState,
  Job,
  RecentVideoFile,
  TranslationProfile,
  VideoImportError,
  VideoMetadata,
} from '@dubforge/types';
import {
  createJobDefinition,
  setLanguageVoice,
  setOutputConfiguration,
  setTranslationProfile,
  toggleLanguageSelection,
  updateJobDefinition,
} from '@dubforge/job-config';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { appService, pipelineService, videoService } from '../services';
import { estimationService, presetService, validationService } from '../services/job-config';
import { isVideoImportError } from '../services/video-import-error';
import { VideoImportRejectedError } from '../services/ipc/video-import-result';

interface HomeStoreState {
  readonly appInfo: AsyncState<AppInfo>;
  readonly jobDefinition: JobDefinition;
  readonly estimation: JobEstimation;
  readonly validation: JobValidationResult;
  readonly presets: readonly JobPreset[];
  readonly activePresetId: string | null;
  readonly activeJob: Job | null;
  readonly isStarting: boolean;
  readonly startError: string | null;
  readonly isImporting: boolean;
  readonly importError: VideoImportError | null;
  readonly recentFiles: readonly RecentVideoFile[];
  readonly previewingVoiceId: string | null;
  fetchAppInfo: () => Promise<void>;
  selectVideo: () => Promise<void>;
  inspectDroppedFile: (file: File) => Promise<void>;
  openRecentFile: (id: string) => Promise<void>;
  clearVideo: () => void;
  clearImportError: () => void;
  toggleLanguage: (code: string) => void;
  setProfile: (profile: TranslationProfile) => void;
  setOutput: (partial: Parameters<typeof setOutputConfiguration>[1]) => void;
  setVoice: (languageCode: string, voiceId: string) => void;
  applyPreset: (presetId: string) => void;
  startLocalization: () => Promise<void>;
  fetchActiveJob: () => Promise<void>;
  fetchRecentFiles: () => Promise<void>;
  refreshJobConfig: () => void;
  syncOutputDirectory: (outputDirectory: string) => void;
}

function computeDerivedState(definition: JobDefinition): {
  estimation: JobEstimation;
  validation: JobValidationResult;
} {
  return {
    estimation: estimationService.estimate(definition),
    validation: validationService.validate(definition),
  };
}

function withDefinition(
  definition: JobDefinition,
  presets: readonly JobPreset[],
): Pick<HomeStoreState, 'jobDefinition' | 'estimation' | 'validation' | 'presets'> {
  const derived = computeDerivedState(definition);
  return {
    jobDefinition: definition,
    estimation: derived.estimation,
    validation: derived.validation,
    presets,
  };
}

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

    const nextDefinition = updateJobDefinition(get().jobDefinition, { video: metadata });
    set({
      ...withDefinition(nextDefinition, get().presets),
      isImporting: false,
      importError: null,
      startError: null,
      activePresetId: null,
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

const initialDefinition = createJobDefinition();
const initialDerived = computeDerivedState(initialDefinition);

export const useHomeStore = create<HomeStoreState>()(
  devtools(
    (set, get) => ({
      appInfo: { status: 'idle', data: null, error: null },
      jobDefinition: initialDefinition,
      estimation: initialDerived.estimation,
      validation: initialDerived.validation,
      presets: presetService.listPresets(),
      activePresetId: null,
      activeJob: null,
      isStarting: false,
      startError: null,
      isImporting: false,
      importError: null,
      recentFiles: [],
      previewingVoiceId: null,
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
        const nextDefinition = updateJobDefinition(get().jobDefinition, { video: null });
        set({
          ...withDefinition(nextDefinition, get().presets),
          activeJob: null,
          startError: null,
          importError: null,
          activePresetId: null,
        });
      },
      clearImportError: () => {
        set({ importError: null });
      },
      toggleLanguage: (code) => {
        const nextDefinition = toggleLanguageSelection(get().jobDefinition, code);
        set({
          ...withDefinition(nextDefinition, get().presets),
          activePresetId: null,
        });
      },
      setProfile: (profile) => {
        const nextDefinition = setTranslationProfile(get().jobDefinition, profile);
        set({
          ...withDefinition(nextDefinition, get().presets),
          activePresetId: null,
        });
      },
      setOutput: (partial) => {
        const nextDefinition = setOutputConfiguration(get().jobDefinition, partial);
        set({
          ...withDefinition(nextDefinition, get().presets),
          activePresetId: null,
        });
      },
      setVoice: (languageCode, voiceId) => {
        const nextDefinition = setLanguageVoice(get().jobDefinition, languageCode, voiceId);
        set({
          ...withDefinition(nextDefinition, get().presets),
          activePresetId: null,
        });
      },
      applyPreset: (presetId) => {
        const preset = presetService.getPreset(presetId);
        if (preset === null) {
          return;
        }

        const nextDefinition = presetService.applyPreset(preset, get().jobDefinition);
        set({
          ...withDefinition(nextDefinition, get().presets),
          activePresetId: presetId,
        });
      },
      startLocalization: async () => {
        const definition = get().jobDefinition;
        const validation = validationService.validate(definition);
        set({ validation });

        if (!validation.valid || definition.video === null) {
          return;
        }

        const enabledLanguages = definition.languages
          .filter((language) => language.enabled)
          .map((language) => language.code);

        set({ isStarting: true, startError: null });
        try {
          const job = await pipelineService.startJob({
            video: definition.video,
            languages: enabledLanguages,
            voices: definition.voices,
            profile: definition.profile,
            output: definition.output,
            outputDirectory: definition.outputDirectory,
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
      refreshJobConfig: () => {
        set(withDefinition(get().jobDefinition, presetService.listPresets()));
      },
      syncOutputDirectory: (outputDirectory) => {
        const nextDefinition = updateJobDefinition(get().jobDefinition, { outputDirectory });
        set(withDefinition(nextDefinition, get().presets));
      },
    }),
    { name: 'home-store' },
  ),
);
