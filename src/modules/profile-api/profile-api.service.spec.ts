import { Test, TestingModule } from '@nestjs/testing';
import { ProfileApiService } from './profile-api.service';

describe('MeApiService', () => {
  let service: ProfileApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileApiService],
    }).compile();

    service = module.get<ProfileApiService>(ProfileApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
