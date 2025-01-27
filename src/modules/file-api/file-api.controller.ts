import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MB } from '../../constants/units';
import { Request, Response } from 'express';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { FileApiService } from './file-api.service';
import { UploadFilesDto } from '../../dtos/upload-files-dto';
import { basename, extname } from 'path';

@Controller('file')
export class FileApiController {
  constructor(private readonly fileApiService: FileApiService) {}

  @Get(':uploadDetailName')
  async getFileStream(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('uploadDetailName') uploadDetailName: string,
  ): Promise<StreamableFile> {
    return this.fileApiService.getFileStream(request, response, this.getUploadDetailId(uploadDetailName));
  }

  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /(image\/png|image\/jpeg|image\/jpg|image\/gif|image\/webp|video\/mp4|video\/mov|video\/webm|video\/quicktime)/gim,
        })
        .addMaxSizeValidator({
          maxSize: 100 * MB,
        })
        .build(),
    )
    files: Express.Multer.File[],
    @Body() body: UploadFilesDto,
  ): Promise<string[]> {
    return this.fileApiService.uploadFiles(files, body);
  }

  @Delete(':uploadDetailName')
  @UseGuards(AuthGuard)
  async deleteFile(@Param('uploadDetailName') uploadDetailName: string): Promise<void> {
    return this.fileApiService.deleteFile(this.getUploadDetailId(uploadDetailName));
  }

  /**
   * 파일명에서 확장자를 제외한 문자열 리턴
   * 업로드 된 파일 이름은 `UploadDetail.id` + 확장자명으로 설정됨
   * @param uploadDetailName
   */
  getUploadDetailId(uploadDetailName: string): string {
    return basename(uploadDetailName, extname(uploadDetailName));
  }
}
