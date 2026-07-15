import { execFile } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function isWebpEncoderAvailable(): Promise<boolean> {
  try {
    const outputPath = join(tmpdir(), `dubforge-webp-probe-${String(Date.now())}.webp`);
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc=d=1:s=16x16',
        '-frames:v',
        '1',
        '-c:v',
        'libwebp',
        outputPath,
      ],
      { timeout: 10_000 },
    );
    await access(outputPath);
    await rm(outputPath, { force: true });
    return true;
  } catch {
    return false;
  }
}

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    await execFileAsync('ffprobe', ['-version']);
    return true;
  } catch {
    return false;
  }
}

export async function ensureSampleMp4(outputPath: string): Promise<void> {
  try {
    await access(outputPath);
    return;
  } catch {
    // generate below
  }

  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=1:size=320x240:rate=24',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=1',
      '-pix_fmt',
      'yuv420p',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-shortest',
      outputPath,
    ],
    { timeout: 30_000 },
  );
}

export async function ensureSampleMov(outputPath: string): Promise<void> {
  await ensureGeneratedVideo(outputPath, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=duration=1:size=320x240:rate=24',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-pix_fmt',
    'yuv420p',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-shortest',
    outputPath,
  ]);
}

export async function ensureSampleMkv(outputPath: string): Promise<void> {
  await ensureGeneratedVideo(outputPath, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=duration=1:size=640x360:rate=24',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-pix_fmt',
    'yuv420p',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-shortest',
    outputPath,
  ]);
}

export async function ensurePortraitVideo(outputPath: string): Promise<void> {
  await ensureGeneratedVideo(outputPath, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=duration=1:size=720x1280:rate=24',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-pix_fmt',
    'yuv420p',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-shortest',
    outputPath,
  ]);
}

export async function ensure4kVideo(outputPath: string): Promise<void> {
  await ensureGeneratedVideo(outputPath, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=duration=1:size=3840x2160:rate=24',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-pix_fmt',
    'yuv420p',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-shortest',
    outputPath,
  ]);
}

export async function ensureAudioOnlyMp4(outputPath: string): Promise<void> {
  await ensureGeneratedVideo(outputPath, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    outputPath,
  ]);
}

export async function ensureCorruptedVideo(outputPath: string): Promise<void> {
  await writeFile(outputPath, 'not-a-valid-video-container', 'utf8');
}

async function ensureGeneratedVideo(outputPath: string, args: readonly string[]): Promise<void> {
  try {
    await access(outputPath);
    return;
  } catch {
    // generate below
  }

  await execFileAsync('ffmpeg', [...args], { timeout: 60_000 });
}

export async function createTempVideo(
  prefix: string,
  extension: string,
  generator: (path: string) => Promise<void>,
): Promise<{ readonly directory: string; readonly filePath: string }> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  const filePath = join(directory, `sample${extension}`);
  await generator(filePath);
  return { directory, filePath };
}
