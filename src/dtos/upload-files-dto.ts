import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadFilesDto {
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  width?: number;
}
