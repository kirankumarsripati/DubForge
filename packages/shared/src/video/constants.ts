export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mkv'] as const;

export const SUPPORTED_VIDEO_CONTAINERS = ['mov', 'mp4', 'matroska', 'webm'] as const;

export const MAX_VIDEO_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

export const MAX_VIDEO_DURATION_SECONDS = 120 * 60;

export const THUMBNAIL_POSITION_RATIO = 0.1;

export const MAX_RECENT_VIDEO_FILES = 10;

export const THUMBNAIL_WIDTH = 320;

export const THUMBNAIL_HEIGHT = 180;
