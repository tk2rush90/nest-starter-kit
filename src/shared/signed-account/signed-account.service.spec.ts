import { Test, TestingModule } from '@nestjs/testing';
import { SignedAccountService } from './signed-account.service';

describe('SignedAccountService', () => {
  let service: SignedAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignedAccountService],
    }).compile();

    service = module.get<SignedAccountService>(SignedAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
