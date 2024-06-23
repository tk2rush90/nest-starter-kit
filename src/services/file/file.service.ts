import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createReadStream, existsSync, ReadStream, renameSync, unlinkSync, writeFileSync } from 'fs';
import { configs } from '../../configs/configs';
import { basename, extname, join } from 'path';
import { CryptoService } from '../crypto/crypto.service';
import { UNEXPECTED_ERROR } from '../../constants/errors';
import * as sizeOf from 'buffer-image-size';
import * as Sharp from 'sharp';
import * as FluentFFMpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';

@Injectable()
export class FileService {
  private readonly _logger = new Logger('FileService');

  constructor(private readonly _cryptoService: CryptoService) {}

  /**
   * Get `ReadStream` of file in media directory.
   * @param filename - Filename to get.
   * @return `ReadStream`.
   */
  getReadStream(filename: string): ReadStream {
    return createReadStream(join(configs.paths.files, filename));
  }

  /**
   * Save file to media upload path.
   * When filename is duplicated, it throws exception.
   * @param filename - Filename to save as.
   * @param buffer - File buffer to save.
   */
  save(filename: string, buffer: Buffer): void {
    // Create upload target path.
    const uploadTargetPath = join(configs.paths.files, filename);

    // Check duplicated filename.
    if (existsSync(uploadTargetPath)) {
      this._logger.error('Filename is duplicated for: ' + filename);

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    }

    try {
      // Create file.
      writeFileSync(uploadTargetPath, buffer);
    } catch (e) {
      this._logger.error('Failed to save file: ' + e.toString(), e.stack);

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    }
  }

  /**
   * Save temporary file.
   * @param filename - Filename to save as temporary.
   * @param buffer - File buffer to save.
   */
  saveTemporary(filename: string, buffer: Buffer): void {
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
   * Remove file to trash directory.
   * When file not found, ignored.
   * @param filename - Filename to remove.
   */
  remove(filename: string): void {
    // Create removing target path.
    const removingTargetPath = join(configs.paths.files, filename);

    // Works only when removing target exists.
    if (existsSync(removingTargetPath)) {
      try {
        // Move file to trash directory.
        // File is not removed immediately.
        // They only can be removed by background scheduler.
        renameSync(removingTargetPath, join(configs.paths.deletedFiles, filename));
      } catch (e) {
        this._logger.error('Failed to remove file: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      }
    }
  }

  /**
   * Remove temporary media to trash directory.
   * @param filename - Filename to remove from temporary directory.
   */
  removeTemporary(filename: string): void {
    // Create removing target path.
    const removingTargetPath = join(configs.paths.temporaryFiles, filename);

    // Works only when removing target exists.
    if (existsSync(removingTargetPath)) {
      try {
        // Move file to trash directory.
        // File is not removed immediately.
        // They only can be removed by background scheduler.
        renameSync(removingTargetPath, join(configs.paths.deletedFiles, filename));
      } catch (e) {
        this._logger.error('Failed to remove file: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      }
    }
  }

  /**
   * Remove file completely from trash directory.
   * When file not found, ignored.
   * @param filename - Filename to remove.
   */
  removeTrash(filename: string): void {
    // Create removing target path.
    const removingTargetPath = join(configs.paths.deletedFiles, filename);

    // Works only when removing target exists.
    if (existsSync(removingTargetPath)) {
      try {
        // Remove file from trash directory
        unlinkSync(removingTargetPath);
      } catch (e) {
        this._logger.error('Failed to remove file from trash: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      }
    }
  }

  /**
   * Restore file from trash directory.
   * When file not found, ignored.
   * @param filename - Filename to restore.
   */
  restoreTrash(filename: string): void {
    const restoringTargetPath = join(configs.paths.deletedFiles, filename);

    if (existsSync(restoringTargetPath)) {
      try {
        // Move file to media directory.
        renameSync(restoringTargetPath, join(configs.paths.files, filename));
      } catch (e) {
        this._logger.error('Failed to restore file: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      }
    }
  }

  /**
   * Resize image buffer by `targetWidth`.
   * It keeps aspect ratio of original image.
   * @param buffer - Buffer to resize.
   * @param targetWidth - Target width to resize.
   * @returns Returns resized buffer.
   */
  async resizeImageBuffer(buffer: Buffer, targetWidth: number): Promise<Buffer> {
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
  async formatVideo(filename: string, buffer: Buffer): Promise<void> {
    // Save temporary file.
    this.saveTemporary(filename, buffer);

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
   * Capture video thumbnail.
   * The thumbnail will have same filename with video, but has `png` extension.
   * @param filename - Filename of video in media directory.
   * @returns Returns created thumbnail name.
   */
  async captureVideoThumbnail(filename: string): Promise<string> {
    // Get video metadata.
    const metadata = await this.getVideoMetadata(filename);

    // Find video stream.
    const videoStream = metadata.streams.find((_stream) => _stream.codec_type === 'video');

    // Throw exception when stream not found.
    if (!videoStream) {
      this._logger.error('Failed to find video stream from metadata');

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    }

    // Create thumbnail filename.
    const thumbnailFilename = this.replaceExtension(filename, 'png');

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
   * Get video metadata.
   * @param filename - Filename in media directory.
   * @returns Returns metadata read by ffprobe.
   */
  async getVideoMetadata(filename: string): Promise<FfprobeData> {
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

  /**
   * Create random filename by provided file.
   * It uses `originalname` of file.
   * @param file - Multer file to create random filename.
   * @returns Returns randomly created filename.
   */
  createRandomFilename(file: Express.Multer.File): string {
    // Create random UUID.
    const randomUUID = this._cryptoService.createUUID();

    // Combine created UUID and file extension.
    return randomUUID + extname(file.originalname);
  }

  /**
   * Replace extension of provided filename.
   * @param filename - Filename to replace extension.
   * @param extension - New extension to set. Do not set dot.
   * @returns Returns filename with new extension.
   */
  replaceExtension(filename: string, extension: string): string {
    return basename(filename, extname(filename)) + '.' + extension;
  }
}
