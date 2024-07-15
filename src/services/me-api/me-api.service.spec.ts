import { Test, TestingModule } from '@nestjs/testing';
import { MeApiService } from './me-api.service';

describe('MeApiService', () => {
  let service: MeApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeApiService],
    }).compile();

    service = module.get<MeApiService>(MeApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
