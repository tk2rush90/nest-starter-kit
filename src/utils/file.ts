import * as sizeOf from 'buffer-image-size';
import * as Sharp from 'sharp';
import { InternalServerErrorException } from '@nestjs/common';
import { UNEXPECTED_ERROR } from '../constants/errors';
import * as FluentFFMpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';
import { basename, extname, join } from 'path';
import { configs } from '../configs/configs';
import { existsSync, statSync, unlinkSync, writeFileSync } from 'fs';

export function createFile(filePath: string, buffer: Buffer): void {
  writeFileSync(join(filePath), buffer);
}

export function getFileSize(filePath: string): number {
  if (existsSync(filePath)) {
    const stat = statSync(filePath);

    return stat.size;
  } else {
    return 0;
  }
}

/**
 * Delete file if exists.
 * @param filePath
 */
export function deleteFileIfExists(filePath: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

/**
 * Resize image buffer by `targetWidth`.
 * It keeps aspect ratio of original image.
 * @param buffer - Buffer to resize.
 * @param targetWidth - Target width to resize.
 */
export async function resizeToWebP(buffer: Buffer, targetWidth: number): Promise<Buffer> {
  // Get width/height of `buffer`.
  const bufferSize = sizeOf(buffer);

  // Get aspect ratio of `buffer`.
  const aspectRatio = bufferSize.height / bufferSize.width;

  // When `width` of `buffer` is bigger than `targetWidth`, resize.
  if (bufferSize.width > targetWidth) {
    // Calculate new width and height.
    const newWidth = targetWidth;
    const newHeight = targetWidth * aspectRatio;

    // Process image size with Sharp.
    return Sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        fit: 'outside',
      })
      .webp()
      .toBuffer();
  } else {
    // Process image rotate with Sharp.
    return Sharp(buffer, { failOn: 'none' }).rotate().webp().toBuffer();
  }
}

export async function resizeGif(buffer: Buffer, targetWidth: number): Promise<Buffer> {
  // Get width/height of `buffer`.
  const bufferSize = sizeOf(buffer);

  // Get aspect ratio of `buffer`.
  const aspectRatio = bufferSize.height / bufferSize.width;

  // When `width` of `buffer` is bigger than `targetWidth`, resize.
  if (bufferSize.width > targetWidth) {
    // Calculate new width and height.
    const newWidth = targetWidth;
    const newHeight = targetWidth * aspectRatio;

    // Process image size with Sharp.
    return Sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        fit: 'outside',
      })
      .gif()
      .toBuffer();
  } else {
    // Process image rotate with Sharp.
    return Sharp(buffer, { failOn: 'none' }).rotate().gif().toBuffer();
  }
}

/**
 * Format a video.
 * @param sourceFilePath
 * @param targetFilePath
 */
export async function formatVideo(sourceFilePath: string, targetFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Error message to contain stderr.
    let errorMessage = '';

    FluentFFMpeg(sourceFilePath)
      .outputOptions(['-vf', `scale='min(1024,iw):-2'`, '-c:a copy', '-b:v 800k'])
      .format('mp4') // 결과물을 MP4 형식으로 인코딩
      .on('end', () => {
        resolve();
      })
      .on('stderr', (err) => {
        errorMessage += err;
      })
      .on('error', (err: Error) => {
        reject(err);
      })
      .save(targetFilePath);
  });
}

/**
 * Capture video thumbnail.
 * The thumbnail will have same filename with video, but has `png` extension.
 * @param filename - Filename of video in media directory.
 */
export async function captureVideoThumbnail(filename: string): Promise<string> {
  // Get video metadata.
  const metadata = await getVideoMetadata(filename);

  // Find video stream.
  const videoStream = metadata.streams.find((_stream) => _stream.codec_type === 'video');

  // Throw exception when stream not found.
  if (!videoStream) {
    throw new InternalServerErrorException(UNEXPECTED_ERROR);
  }

  // Create thumbnail filename.
  const thumbnailFilename = replaceExtension(filename, 'png');

  // Capture screenshot.
  return new Promise<string>((resolve, reject) => {
    FluentFFMpeg(join(configs.paths.files, filename))
      .screenshots({
        count: 1,
        folder: configs.paths.files,
        size: `${videoStream.width}x${videoStream.height}`,
        filename: thumbnailFilename,
      })
      .on('end', () => {
        resolve(thumbnailFilename);
      })
      .on('error', (err: Error) => {
        reject(err);
      });
  });
}

/**
 * Replace extension of provided filename.
 * @param filename - Filename to replace extension.
 * @param extension - New extension to set. Do not set dot.
 */
export function replaceExtension(filename: string, extension: string): string {
  return basename(filename, extname(filename)) + '.' + extension;
}

/**
 * Get video metadata.
 * @param filename - Filename in media directory.
 */
export async function getVideoMetadata(filename: string): Promise<FfprobeData> {
  return new Promise<FfprobeData>((resolve, reject) => {
    FluentFFMpeg.ffprobe(join(configs.paths.files, filename), (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}
