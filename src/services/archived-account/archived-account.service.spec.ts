import { Test, TestingModule } from '@nestjs/testing';
import { ArchivedAccountService } from './archived-account.service';

describe('ArchivedAccountService', () => {
  let service: ArchivedAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArchivedAccountService],
    }).compile();

    service = module.get<ArchivedAccountService>(ArchivedAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
