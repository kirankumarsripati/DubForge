import { ipcMain, protocol, dialog, BrowserWindow, type OpenDialogOptions } from 'electron';
import { readFile } from 'node:fs/promises';
import {
  inspectVideoFileRequestSchema,
  openRecentVideoRequestSchema,
  VIDEO_IPC_CHANNELS,
  videoImportErrorResponseSchema,
  videoImportResultSchema,
  videoMetadataResponseSchema,
  type VideoImportResult,
} from '@dubforge/shared';
import type { ServiceContainer } from '@dubforge/shared';
import { VIDEO_CACHE_SERVICE_TOKEN, VIDEO_IMPORT_SERVICE_TOKEN } from '../container';
import { VideoImportError } from '../services/video-import-service';

function toImportFailure(videoImportError: VideoImportError): VideoImportResult {
  const response = videoImportErrorResponseSchema.parse({
    title: videoImportError.failure.title,
    description: videoImportError.failure.description,
    recoveryAction: videoImportError.failure.recoveryAction,
  });

  const failure: VideoImportResult = { ok: false, error: response };
  return failure;
}

async function importVideoFile(
  importFile: () => Promise<import('@dubforge/shared').VideoMetadataResponse>,
): Promise<VideoImportResult> {
  try {
    const metadata = await importFile();
    return videoImportResultSchema.parse({ ok: true, data: metadata });
  } catch (error) {
    if (error instanceof VideoImportError) {
      return toImportFailure(error);
    }

    throw error;
  }
}

export function registerPrivilegedSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'dubforge',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

export function registerThumbnailProtocol(container: ServiceContainer): void {
  const cacheService = container.resolve(VIDEO_CACHE_SERVICE_TOKEN);

  protocol.handle('dubforge', async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'thumbnail') {
      return new Response('Not found', { status: 404 });
    }

    const videoId = url.pathname.replace(/^\//, '');
    if (videoId.length === 0) {
      return new Response('Not found', { status: 404 });
    }

    const { thumbnailPath } = cacheService.getPaths(videoId);

    try {
      const bytes = await readFile(thumbnailPath);
      return new Response(bytes, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=31536000',
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

export function registerVideoIpcHandlers(container: ServiceContainer): void {
  const importService = container.resolve(VIDEO_IMPORT_SERVICE_TOKEN);

  ipcMain.handle(VIDEO_IPC_CHANNELS.SELECT_FILE, async () => {
    const parentWindow = BrowserWindow.getFocusedWindow();
    const dialogOptions: OpenDialogOptions = {
      properties: ['openFile'],
      filters: [{ name: 'Video', extensions: ['mp4', 'mkv'] }],
    };
    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    if (filePath === undefined) {
      return null;
    }

    return importVideoFile(async () => {
      const metadata = await importService.importFile(filePath);
      return videoMetadataResponseSchema.parse(metadata);
    });
  });

  ipcMain.handle(VIDEO_IPC_CHANNELS.INSPECT_FILE, async (_event, payload: unknown) => {
    const request = inspectVideoFileRequestSchema.parse(payload);

    return importVideoFile(async () => {
      const metadata = await importService.importFile(request.filePath);
      return videoMetadataResponseSchema.parse(metadata);
    });
  });

  ipcMain.handle(VIDEO_IPC_CHANNELS.LIST_RECENT, async () => {
    return importService.listRecentFiles();
  });

  ipcMain.handle(VIDEO_IPC_CHANNELS.OPEN_RECENT, async (_event, payload: unknown) => {
    const request = openRecentVideoRequestSchema.parse(payload);

    return importVideoFile(async () => {
      const metadata = await importService.openRecentFile(request.id);
      return videoMetadataResponseSchema.parse(metadata);
    });
  });
}
