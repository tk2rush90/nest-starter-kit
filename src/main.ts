import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configs } from './configs/configs';
import { AppExceptionFilterFilter } from './filters/app-exception-filter/app-exception-filter.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppInterceptor } from './interceptors/app/app.interceptor';
import { ValidationError } from 'class-validator';
import { BAD_REQUEST } from './constants/errors';
import { json, urlencoded } from 'express';

async function bootstrap(): Promise<void> {
  let app: NestExpressApplication;

  // Check whether SSL is available or not.
  const canRunOnHttps =
    configs.ssl.cert && configs.ssl.key && existsSync(configs.ssl.cert) && existsSync(configs.ssl.key);

  if (canRunOnHttps) {
    // Create NestJS app with SSL.
    app = await NestFactory.create<NestExpressApplication>(AppModule, {
      httpsOptions: {
        cert: readFileSync(configs.ssl.cert),
        key: readFileSync(configs.ssl.key),
      },
    });
  } else {
    // Create NestJS app without SSL.
    app = await NestFactory.create<NestExpressApplication>(AppModule);
  }

  // Get winston logger
  const logger: Logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  // Use winston logger as default logger.
  app.useLogger(logger);

  // Use global filters.
  app.useGlobalFilters(new AppExceptionFilterFilter());

  // Use global interceptor.
  app.useGlobalInterceptors(new AppInterceptor());

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
    origin: [],
    credentials: true,
  });

  // To use IPv4, set `hostname` as `0.0.0.0`.
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
