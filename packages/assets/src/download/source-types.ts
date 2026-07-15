export const DOWNLOAD_SOURCE_TYPES = {
  GITHUB_RELEASE: 'github-release',
  HUGGINGFACE: 'huggingface',
  LOCAL_FILE: 'local-file',
  MIRROR: 'mirror',
} as const;

export type DownloadSourceType = (typeof DOWNLOAD_SOURCE_TYPES)[keyof typeof DOWNLOAD_SOURCE_TYPES];
