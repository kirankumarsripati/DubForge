import type {
  AppInfo,
  AppSettings,
  Job,
  LocalizationLanguage,
  Model,
  PipelineStage,
  VideoMetadata,
} from '@dubforge/types';

export const MOCK_APP_INFO: AppInfo = {
  name: 'DubForge',
  version: '0.1.0',
  license: 'MIT',
  description:
    'Offline-first AI-powered desktop application for translating, dubbing and localizing videos.',
};

export const MOCK_DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'en',
  notificationsEnabled: true,
  metalAcceleration: true,
  threadCount: 4,
  memoryLimitMb: 8192,
  outputDirectory: '~/Movies/DubForge',
  cacheAutoClean: false,
  offlineMode: true,
  developerMode: false,
  defaultProfile: 'balanced',
};

export const MOCK_SAMPLE_VIDEO: VideoMetadata = {
  id: 'mock-sample-video',
  filename: 'morning-yoga-flow.mp4',
  durationSeconds: 3720,
  resolution: '1920×1080',
  codec: 'H.264',
  audioTracks: 1,
  fileSizeBytes: 1_458_000_000,
  frameRate: 29.97,
  bitrateKbps: 3200,
  thumbnailUrl: null,
};

export const MOCK_LANGUAGES: readonly LocalizationLanguage[] = [
  { code: 'en', label: 'English', enabled: true },
  { code: 'hi', label: 'Hindi', enabled: true },
  { code: 'te', label: 'Telugu', enabled: true },
  { code: 'ta', label: 'Tamil', enabled: false },
  { code: 'kn', label: 'Kannada', enabled: false },
  { code: 'mr', label: 'Marathi', enabled: false },
  { code: 'gu', label: 'Gujarati', enabled: false },
  { code: 'bn', label: 'Bengali', enabled: false },
  { code: 'pa', label: 'Punjabi', enabled: false },
];

const completedStages: readonly PipelineStage[] = [
  { name: 'validate', label: 'Validate', status: 'completed', progress: 100 },
  { name: 'extract-audio', label: 'Extract Audio', status: 'completed', progress: 100 },
  { name: 'speech-recognition', label: 'Speech Recognition', status: 'completed', progress: 100 },
  { name: 'translate', label: 'Translate', status: 'completed', progress: 100 },
  { name: 'generate-speech', label: 'Generate Speech', status: 'completed', progress: 100 },
  { name: 'mux', label: 'Mux', status: 'completed', progress: 100 },
  { name: 'verify', label: 'Verify', status: 'completed', progress: 100 },
];

const processingStages: readonly PipelineStage[] = [
  { name: 'validate', label: 'Validate', status: 'completed', progress: 100 },
  { name: 'extract-audio', label: 'Extract Audio', status: 'completed', progress: 100 },
  { name: 'speech-recognition', label: 'Speech Recognition', status: 'completed', progress: 100 },
  { name: 'translate', label: 'Translate Hindi', status: 'running', progress: 62 },
  { name: 'generate-speech', label: 'Generate Telugu Speech', status: 'pending', progress: 0 },
  { name: 'mux', label: 'Mux', status: 'pending', progress: 0 },
  { name: 'verify', label: 'Verify', status: 'pending', progress: 0 },
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-001',
    filename: 'morning-yoga-flow.mp4',
    status: 'completed',
    languages: ['hi', 'te'],
    progress: 100,
    startedAt: '2026-07-14T08:15:00Z',
    finishedAt: '2026-07-14T09:02:00Z',
    durationSeconds: 2820,
    outputPath: '~/Movies/DubForge/morning-yoga-flow.mkv',
    stages: completedStages,
    error: null,
  },
  {
    id: 'job-002',
    filename: 'product-demo.mp4',
    status: 'processing',
    languages: ['hi'],
    progress: 48,
    startedAt: '2026-07-15T04:30:00Z',
    finishedAt: null,
    durationSeconds: null,
    outputPath: null,
    stages: processingStages,
    error: null,
  },
  {
    id: 'job-003',
    filename: 'lecture-intro.mkv',
    status: 'failed',
    languages: ['te'],
    progress: 22,
    startedAt: '2026-07-13T16:00:00Z',
    finishedAt: '2026-07-13T16:08:00Z',
    durationSeconds: 480,
    outputPath: null,
    stages: [
      { name: 'validate', label: 'Validate', status: 'completed', progress: 100 },
      { name: 'extract-audio', label: 'Extract Audio', status: 'failed', progress: 0 },
      { name: 'speech-recognition', label: 'Speech Recognition', status: 'skipped', progress: 0 },
      { name: 'translate', label: 'Translate', status: 'skipped', progress: 0 },
      { name: 'generate-speech', label: 'Generate Speech', status: 'skipped', progress: 0 },
      { name: 'mux', label: 'Mux', status: 'skipped', progress: 0 },
      { name: 'verify', label: 'Verify', status: 'skipped', progress: 0 },
    ],
    error: {
      title: 'Audio extraction failed',
      description: 'FFmpeg could not read the audio stream from this file.',
      recoveryAction: 'Verify the file plays correctly in another app, then retry.',
    },
  },
];

export const MOCK_MODELS: Model[] = [
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large v3',
    category: 'speech-to-text',
    status: 'ready',
    version: '3.0.0',
    sizeBytes: 3_090_000_000,
    downloadProgress: null,
  },
  {
    id: 'seamless-m4t',
    name: 'SeamlessM4T',
    category: 'translation',
    status: 'installed',
    version: '2.1.0',
    sizeBytes: 4_800_000_000,
    downloadProgress: null,
  },
  {
    id: 'kokoro-v1',
    name: 'Kokoro',
    category: 'speech',
    status: 'downloading',
    version: '1.0.0',
    sizeBytes: 1_200_000_000,
    downloadProgress: 67,
  },
  {
    id: 'whisper-medium',
    name: 'Whisper Medium',
    category: 'speech-to-text',
    status: 'missing',
    version: '3.0.0',
    sizeBytes: 1_500_000_000,
    downloadProgress: null,
  },
];
