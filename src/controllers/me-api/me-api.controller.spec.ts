import { Test, TestingModule } from '@nestjs/testing';
import { MeApiController } from './me-api.controller';

describe('MeApiController', () => {
  let controller: MeApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeApiController],
    }).compile();

    controller = module.get<MeApiController>(MeApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
