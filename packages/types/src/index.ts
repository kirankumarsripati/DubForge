export type AppRoute = 'home' | 'jobs' | 'models' | 'settings' | 'about';

export type JobStatus =
  'queued' | 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type PipelineStageName =
  | 'validate'
  | 'extract-audio'
  | 'speech-recognition'
  | 'translate'
  | 'generate-speech'
  | 'mux'
  | 'verify';

export interface PipelineStage {
  readonly name: PipelineStageName;
  readonly label: string;
  readonly status: PipelineStageStatus;
  readonly progress: number;
}

export interface JobError {
  readonly title: string;
  readonly description: string;
  readonly recoveryAction: string;
}

export interface Job {
  readonly id: string;
  readonly filename: string;
  readonly status: JobStatus;
  readonly languages: readonly string[];
  readonly progress: number;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly durationSeconds: number | null;
  readonly outputPath: string | null;
  readonly stages: readonly PipelineStage[];
  readonly error: JobError | null;
}

export type ModelCategory = 'speech-to-text' | 'translation' | 'speech';

export type ModelStatus = 'installed' | 'downloading' | 'missing' | 'ready' | 'updating';

export interface Model {
  readonly id: string;
  readonly name: string;
  readonly category: ModelCategory;
  readonly status: ModelStatus;
  readonly version: string;
  readonly sizeBytes: number;
  readonly downloadProgress: number | null;
}

export type TranslationProfile = 'fast' | 'balanced' | 'studio';

export type ThemePreference = 'dark' | 'light' | 'system';

export interface AppSettings {
  readonly theme: ThemePreference;
  readonly language: string;
  readonly notificationsEnabled: boolean;
  readonly metalAcceleration: boolean;
  readonly threadCount: number;
  readonly memoryLimitMb: number;
  readonly outputDirectory: string;
  readonly cacheAutoClean: boolean;
  readonly offlineMode: boolean;
  readonly developerMode: boolean;
  readonly defaultProfile: TranslationProfile;
}

export interface VideoMetadata {
  readonly id: string;
  readonly filename: string;
  readonly durationSeconds: number;
  readonly resolution: string;
  readonly codec: string;
  readonly audioTracks: number;
  readonly fileSizeBytes: number;
  readonly frameRate: number;
  readonly bitrateKbps: number;
  readonly thumbnailUrl: string | null;
}

export interface RecentVideoFile {
  readonly id: string;
  readonly filename: string;
  readonly importedAt: string;
  readonly durationSeconds: number;
  readonly thumbnailUrl: string | null;
}

export interface VideoImportError {
  readonly title: string;
  readonly description: string;
  readonly recoveryAction: string;
}

export interface LocalizationLanguage {
  readonly code: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly isSource?: boolean;
}

export interface OutputOptions {
  readonly generateTranslatedAudio: boolean;
  readonly generateSubtitles: boolean;
  readonly embedSubtitles: boolean;
  readonly exportSrt: boolean;
  readonly exportTranscript: boolean;
}

export interface StartJobRequest {
  readonly video: VideoMetadata;
  readonly languages: readonly string[];
  readonly voices: Readonly<Record<string, string>>;
  readonly profile: TranslationProfile;
  readonly output: OutputOptions;
  readonly outputDirectory: string;
}

export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly license: string;
  readonly description: string;
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  readonly status: AsyncStatus;
  readonly data: T | null;
  readonly error: string | null;
}

export interface JobService {
  listJobs(): Promise<readonly Job[]>;
  getJob(id: string): Promise<Job | null>;
  deleteJob(id: string): Promise<void>;
  retryJob(id: string): Promise<Job>;
}

export interface ModelService {
  listModels(): Promise<readonly Model[]>;
  downloadModel(id: string): Promise<Model>;
  deleteModel(id: string): Promise<void>;
  updateModel(id: string): Promise<Model>;
}

export interface SettingsService {
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
}

export interface PipelineService {
  startJob(request: StartJobRequest): Promise<Job>;
  cancelJob(id: string): Promise<void>;
  getActiveJob(): Promise<Job | null>;
}

export interface AppService {
  getAppInfo(): Promise<AppInfo>;
}

export interface VideoService {
  selectFile(): Promise<VideoMetadata | null>;
  inspectFile(filePath: string): Promise<VideoMetadata>;
  listRecentFiles(): Promise<readonly RecentVideoFile[]>;
  openRecentFile(id: string): Promise<VideoMetadata>;
}
