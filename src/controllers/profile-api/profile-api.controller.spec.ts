import { Test, TestingModule } from '@nestjs/testing';
import { ProfileApiController } from './profile-api.controller';

describe('MeApiController', () => {
  let controller: ProfileApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileApiController],
    }).compile();

    controller = module.get<ProfileApiController>(ProfileApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
