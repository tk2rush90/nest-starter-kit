import { Test, TestingModule } from '@nestjs/testing';
import { UploadDetailService } from './upload-detail.service';

describe('UploadDetailsService', () => {
  let service: UploadDetailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadDetailService],
    }).compile();

    service = module.get<UploadDetailService>(UploadDetailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
