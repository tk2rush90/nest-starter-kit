import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configs } from './configs/configs';
import { AppExceptionFilter } from './filters/app-exception/app-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ValidationError } from 'class-validator';
import { BAD_REQUEST } from './constants/errors';
import { json, urlencoded } from 'express';
import { RequestInterceptor } from './interceptors/request/request.interceptor';

async function bootstrap(): Promise<void> {
  const app: NestExpressApplication = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get winston logger
  const logger: Logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  // Use winston logger as default logger.
  app.useLogger(logger);

  // Use global filters.
  app.useGlobalFilters(new AppExceptionFilter());

  app.useGlobalInterceptors(new RequestInterceptor());

  // Add global pipes.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // Transform exception to common exception.
      exceptionFactory: (errors: ValidationError[]): void => {
        logger.error('Validation error: ' + errors.join(', '));

        throw new BadRequestException(BAD_REQUEST, errors.join(','));
      },
    }),
  );

  // Add middlewares.
  app.use(
    // To handle request body.
    json({ limit: Infinity }),
    // To handle request query.
    urlencoded({ limit: '50mb', extended: true }),
  );

  // Enable CORS.
  app.enableCors({
    origin: ['http://localhost:4200'],
    credentials: true,
  });

  // To use IPv4, set `hostname` as `0.0.0.0`.
  await app.listen(configs.etc.production ? 3006 : 3000, '0.0.0.0');
}
bootstrap();
