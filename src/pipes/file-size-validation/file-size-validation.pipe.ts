import { Injectable, PayloadTooLargeException, PipeTransform } from '@nestjs/common';
import { FILE_TOO_LARGE } from '../../constants/errors';

/**
 * Pipe to validate file max size.
 * Pass max size in bytes as constructor parameter.
 * It throws PayloadTooLargeException when validation failed.
 *
 * @example
 * ```typescript
 * @UploadedFile(new FileTypeValidationPipe(500000) // Allow 5mb max size
 * ```
 */
@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  constructor(private readonly _maxSize: number) {}

  transform(
    fileOrFiles: Express.Multer.File | Express.Multer.File[] | undefined,
  ): Express.Multer.File | Express.Multer.File[] | undefined {
    if (fileOrFiles instanceof Array) {
      fileOrFiles.forEach((_file) => this._validateMaxSize(_file));
    } else if (fileOrFiles) {
      this._validateMaxSize(fileOrFiles);
    }

    return fileOrFiles;
  }

  /**
   * Validate file size.
   * When file size is bigger than `_maxSize`, throws exception.
   * @param file - File to validate.
   */
  private _validateMaxSize(file: Express.Multer.File): void {
    if (this._maxSize < file.size) {
      throw new PayloadTooLargeException(FILE_TOO_LARGE);
    }
  }
}
