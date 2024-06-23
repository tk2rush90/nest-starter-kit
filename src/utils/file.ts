import * as sizeOf from 'buffer-image-size';
import * as Sharp from 'sharp';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { UNEXPECTED_ERROR } from '../constants/errors';
import * as FluentFFMpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';
import { basename, extname, join } from 'path';
import { configs } from '../configs/configs';
import { existsSync, writeFileSync } from 'fs';

/**
 * Resize image buffer by `targetWidth`.
 * It keeps aspect ratio of original image.
 * @param buffer - Buffer to resize.
 * @param targetWidth - Target width to resize.
 * @returns Returns resized buffer.
 */
export async function resizeImageBuffer(buffer: Buffer, targetWidth: number): Promise<Buffer> {
  this._logger = new Logger('resizeImageBuffer');

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
      .withMetadata()
      .resize({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        fit: 'outside',
      })
      .toBuffer()
      .catch((e) => {
        this._logger.error('Failed to resize image: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  } else {
    // Process image rotate with Sharp.
    return Sharp(buffer, { failOn: 'none' })
      .rotate()
      .withMetadata()
      .toBuffer()
      .catch((e) => {
        this._logger.error('Failed to rotate image: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  }
}

/**
 * Resize video.
 * @param filename - Filename to save as temporary and process.
 * @param buffer - Buffer to save as temporary.
 */
export async function formatVideo(filename: string, buffer: Buffer): Promise<void> {
  this._logger = new Logger('formatVideo');

  // Save temporary file.
  saveTemporary(filename, buffer);

  return new Promise((resolve, reject) => {
    // Error message to contain stderr.
    let errorMessage = '';

    FluentFFMpeg(join(configs.paths.temporaryFiles, filename))
      .outputOptions(['-vf', `scale='min(1024,iw):-2'`, '-c:a copy', '-b:v 800k'])
      .format('mp4') // 결과물을 MP4 형식으로 인코딩
      .on('end', () => {
        resolve();
      })
      .on('stderr', (err) => {
        errorMessage += err;
      })
      .on('error', (err: Error) => {
        this._logger.error('Failed to format video: ' + err.toString(), err.stack);
        this._logger.error('Full error: ' + errorMessage);

        reject(err);
      })
      .save(join(configs.paths.files, filename));
  });
}

/**
 * Save temporary file.
 * @param filename - Filename to save as temporary.
 * @param buffer - File buffer to save.
 */
function saveTemporary(filename: string, buffer: Buffer): void {
  // Create upload target path.
  const uploadTargetPath = join(configs.paths.temporaryFiles, filename);

  // Check duplicated filename.
  if (existsSync(uploadTargetPath)) {
    this._logger.error('Temporary filename is duplicated for: ' + filename);

    throw new InternalServerErrorException(UNEXPECTED_ERROR);
  }

  try {
    // Create file.
    writeFileSync(uploadTargetPath, buffer);
  } catch (e) {
    this._logger.error('Failed to save temporary file: ' + e.toString(), e.stack);

    throw new InternalServerErrorException(UNEXPECTED_ERROR);
  }
}

/**
 * Capture video thumbnail.
 * The thumbnail will have same filename with video, but has `png` extension.
 * @param filename - Filename of video in media directory.
 * @returns Returns created thumbnail name.
 */
export async function captureVideoThumbnail(filename: string): Promise<string> {
  this._logger = new Logger('captureVideoThumbnail');

  // Get video metadata.
  const metadata = await getVideoMetadata(filename);

  // Find video stream.
  const videoStream = metadata.streams.find((_stream) => _stream.codec_type === 'video');

  // Throw exception when stream not found.
  if (!videoStream) {
    this._logger.error('Failed to find video stream from metadata');

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
        this._logger.error('Failed to capture screenshot of video: ' + err.toString(), err.stack);

        reject(err);
      });
  });
}

/**
 * Replace extension of provided filename.
 * @param filename - Filename to replace extension.
 * @param extension - New extension to set. Do not set dot.
 * @returns Returns filename with new extension.
 */
export function replaceExtension(filename: string, extension: string): string {
  return basename(filename, extname(filename)) + '.' + extension;
}

/**
 * Get video metadata.
 * @param filename - Filename in media directory.
 * @returns Returns metadata read by ffprobe.
 */
export async function getVideoMetadata(filename: string): Promise<FfprobeData> {
  this._logger = new Logger('getVideoMetadata');

  return new Promise<FfprobeData>((resolve, reject) => {
    FluentFFMpeg.ffprobe(join(configs.paths.files, filename), (err, metadata) => {
      if (err) {
        this._logger.error('Failed to get video metadata: ' + err.toString(), err.stack);

        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}
