export const VIDEO_IPC_CHANNELS = {
  SELECT_FILE: 'video:select-file',
  INSPECT_FILE: 'video:inspect-file',
  LIST_RECENT: 'video:list-recent',
  OPEN_RECENT: 'video:open-recent',
  GET_FFPROBE_DIAGNOSTICS: 'video:get-ffprobe-diagnostics',
} as const;

export type VideoIpcChannel = (typeof VIDEO_IPC_CHANNELS)[keyof typeof VIDEO_IPC_CHANNELS];
