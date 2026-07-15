import {
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_FILE_SIZE_BYTES,
  SUPPORTED_VIDEO_CONTAINERS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from './constants';
import type { FfprobeDiagnostics } from './ffprobe-diagnostics';
import { formatFfprobeDiagnostics } from './ffprobe-diagnostics';
import type { VideoFileStats, VideoProbeResult } from './types';

export type VideoValidationCode =
  | 'file-not-found'
  | 'unsupported-extension'
  | 'unsupported-container'
  | 'missing-video-stream'
  | 'missing-audio-stream'
  | 'file-too-large'
  | 'duration-too-long'
  | 'unreadable'
  | 'ffprobe-failed'
  | 'thumbnail-failed';

export interface VideoValidationFailure {
  readonly code: VideoValidationCode;
  readonly title: string;
  readonly description: string;
  readonly recoveryAction: string;
  readonly ffprobeDiagnostics?: FfprobeDiagnostics;
}

const VALIDATION_MESSAGES: Record<
  Exclude<VideoValidationCode, 'ffprobe-failed'>,
  Omit<VideoValidationFailure, 'code' | 'ffprobeDiagnostics'>
> = {
  'file-not-found': {
    title: 'File not found',
    description: 'The selected video file could not be found on disk.',
    recoveryAction: 'Choose another file or verify the file still exists.',
  },
  'unsupported-extension': {
    title: 'Unsupported file type',
    description: 'Only MP4, MKV, and MOV files are supported in this version.',
    recoveryAction: 'Convert the file to MP4, MKV, or MOV, then try again.',
  },
  'unsupported-container': {
    title: 'Unsupported container',
    description: 'The file container is not supported for localization.',
    recoveryAction: 'Use an MP4 or MKV file with standard video and audio streams.',
  },
  'missing-video-stream': {
    title: 'No video stream',
    description: 'This file does not contain a readable video stream.',
    recoveryAction: 'Verify the file plays correctly in another app, then try again.',
  },
  'missing-audio-stream': {
    title: 'No audio stream',
    description: 'This file does not contain a readable audio stream.',
    recoveryAction: 'Use a file with audio, or add an audio track before importing.',
  },
  'file-too-large': {
    title: 'File is too large',
    description: 'Videos larger than 2 GB are not supported in this version.',
    recoveryAction: 'Compress the video or split it into smaller files.',
  },
  'duration-too-long': {
    title: 'Video is too long',
    description: 'Videos longer than 120 minutes are not supported in this version.',
    recoveryAction: 'Trim the video to under 120 minutes, then try again.',
  },
  unreadable: {
    title: 'Unable to read video',
    description: 'The file could not be inspected. It may be corrupt or incomplete.',
    recoveryAction: 'Verify the file plays correctly in another app, then try again.',
  },
  'thumbnail-failed': {
    title: 'Thumbnail generation failed',
    description:
      'The video was inspected successfully, but a preview thumbnail could not be created.',
    recoveryAction: 'You can retry import or continue without a preview image.',
  },
};

export function createValidationFailure(code: VideoValidationCode): VideoValidationFailure {
  if (code === 'ffprobe-failed') {
    return {
      code,
      title: 'Unable to read video',
      description: 'ffprobe could not inspect this file.',
      recoveryAction: 'Install FFmpeg, verify the file plays in another app, then try again.',
    };
  }

  const message = VALIDATION_MESSAGES[code];
  return { code, ...message };
}

export function createFfprobeValidationFailure(
  diagnostics: FfprobeDiagnostics,
): VideoValidationFailure {
  return {
    code: 'ffprobe-failed',
    title: 'Unable to read video',
    description: formatFfprobeDiagnostics(diagnostics),
    recoveryAction: 'Install FFmpeg, verify the file plays in another app, then try again.',
    ffprobeDiagnostics: diagnostics,
  };
}

export class VideoValidationException extends Error {
  constructor(readonly failure: VideoValidationFailure) {
    super(failure.description);
    this.name = 'VideoValidationException';
  }
}

export function validateVideoExtension(filename: string): VideoValidationFailure | null {
  const lowerName = filename.toLowerCase();
  const isSupported = SUPPORTED_VIDEO_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  if (!isSupported) {
    return createValidationFailure('unsupported-extension');
  }

  return null;
}

export function validateVideoFileStats(stats: VideoFileStats): VideoValidationFailure | null {
  const extensionFailure = validateVideoExtension(stats.filename);
  if (extensionFailure !== null) {
    return extensionFailure;
  }

  if (stats.fileSizeBytes > MAX_VIDEO_FILE_SIZE_BYTES) {
    return createValidationFailure('file-too-large');
  }

  return null;
}

function isSupportedContainer(container: string): boolean {
  const formats = container.split(',').map((value) => value.trim().toLowerCase());
  return formats.some((format) =>
    SUPPORTED_VIDEO_CONTAINERS.some((supported) => format.includes(supported)),
  );
}

export function validateVideoProbe(probe: VideoProbeResult): VideoValidationFailure | null {
  if (!isSupportedContainer(probe.container)) {
    return createValidationFailure('unsupported-container');
  }

  if (probe.durationSeconds <= 0) {
    return createValidationFailure('unreadable');
  }

  if (probe.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    return createValidationFailure('duration-too-long');
  }

  if (probe.videoStream.width <= 0 || probe.videoStream.height <= 0) {
    return createValidationFailure('missing-video-stream');
  }

  if (probe.audioTrackCount <= 0) {
    return createValidationFailure('missing-audio-stream');
  }

  return null;
}
