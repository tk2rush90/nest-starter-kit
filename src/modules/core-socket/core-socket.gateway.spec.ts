import { Test, TestingModule } from '@nestjs/testing';
import { CoreSocketGateway } from './core-socket.gateway';

describe('CoreSocketGateway', () => {
  let gateway: CoreSocketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoreSocketGateway],
    }).compile();

    gateway = module.get<CoreSocketGateway>(CoreSocketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
