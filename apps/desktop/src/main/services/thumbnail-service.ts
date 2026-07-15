import { BrowserWindow } from 'electron';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from '@dubforge/shared';

const CAPTURE_TIMEOUT_MS = 15_000;

export class ThumbnailService {
  async generateAtTimestamp(
    videoPath: string,
    timestampSeconds: number,
    outputPath: string,
  ): Promise<void> {
    const window = new BrowserWindow({
      show: false,
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      webPreferences: {
        offscreen: true,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    try {
      const videoUrl = pathToFileURL(videoPath).href;
      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        width: ${String(THUMBNAIL_WIDTH)}px;
        height: ${String(THUMBNAIL_HEIGHT)}px;
        background: #0b0b0c;
        overflow: hidden;
      }
      video {
        width: ${String(THUMBNAIL_WIDTH)}px;
        height: ${String(THUMBNAIL_HEIGHT)}px;
        object-fit: cover;
      }
    </style>
  </head>
  <body>
    <video id="video" src="${videoUrl}" muted preload="auto"></video>
    <script>
      window.__captureReady = new Promise((resolve, reject) => {
        const video = document.getElementById('video');
        const timeout = setTimeout(() => {
          reject(new Error('Thumbnail capture timed out'));
        }, ${String(CAPTURE_TIMEOUT_MS)});

        video.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('Video failed to load for thumbnail capture'));
        });

        video.addEventListener('loadedmetadata', () => {
          video.currentTime = ${String(timestampSeconds)};
        });

        video.addEventListener('seeked', () => {
          clearTimeout(timeout);
          resolve(true);
        });
      });
    </script>
  </body>
</html>`;

      await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await window.webContents.executeJavaScript('window.__captureReady');

      const image = await window.webContents.capturePage();
      const resized = image.resize({ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT });
      await writeFile(outputPath, resized.toPNG());
    } finally {
      window.destroy();
    }
  }
}
