import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { INVALID_FILE_TYPE } from '../../constants/errors';

/**
 * Pipe to validate file type.
 * Pass allowed mimetypes as constructor parameter.
 * It throws BadRequestException when validation failed.
 *
 * @example
 * ```typescript
 * @UploadedFile(new FileTypeValidationPipe(['image/png']) // Validate `image/png` mimetype
 * ```
 */
@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  constructor(private readonly _allowedTypes: string[]) {}

  transform(
    fileOrFiles: Express.Multer.File | Express.Multer.File[] | undefined,
  ): Express.Multer.File | Express.Multer.File[] | undefined {
    if (fileOrFiles instanceof Array) {
      fileOrFiles.forEach((_file) => this._validateTypes(_file));
    } else if (fileOrFiles) {
      this._validateTypes(fileOrFiles);
    }

    return fileOrFiles;
  }

  /**
   * Validate mimetype for provided `file`.
   * It throws exception when invalid mimetype included.
   * @param file - File to validate type.
   */
  private _validateTypes(file: Express.Multer.File): void {
    const passValidation = this._allowedTypes.some((_allowedType) => {
      return _allowedType.toLowerCase() === file.mimetype.toLowerCase();
    });

    if (!passValidation) {
      throw new BadRequestException(INVALID_FILE_TYPE);
    }
  }
}
