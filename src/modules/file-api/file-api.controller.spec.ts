import { Test, TestingModule } from '@nestjs/testing';
import { FileApiController } from './file-api.controller';

describe('UploadApiController', () => {
  let controller: FileApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileApiController],
    }).compile();

    controller = module.get<FileApiController>(FileApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
