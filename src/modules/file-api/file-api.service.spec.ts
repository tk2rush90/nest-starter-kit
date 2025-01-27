import { Test, TestingModule } from '@nestjs/testing';
import { FileApiService } from './file-api.service';

describe('FileApiService', () => {
  let service: FileApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileApiService],
    }).compile();

    service = module.get<FileApiService>(FileApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
