import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { BAD_REQUEST, UNEXPECTED_ERROR } from '../../constants/errors';

/** A filter that catches `Error` to normalize */
@Catch()
export class AppExceptionFilterFilter<T> implements ExceptionFilter {
  private readonly _logger = new Logger('AppExceptionFilterFilter');

  catch(exception: T, host: ArgumentsHost): void {
    const response: Response = host.switchToHttp().getResponse();

    // Log caught exception.
    this._logger.error('Exception is caught: ' + (exception as Error).message, (exception as Error).stack);

    if (exception instanceof ValidationError) {
      // Handle `ValidationError` from `class-validator`.
      const badRequest = new BadRequestException(BAD_REQUEST);

      response.status(badRequest.getStatus()).json(badRequest.getResponse());
    } else if (exception instanceof HttpException) {
      // Handle prepared `HttpException`.
      response.status(exception.getStatus()).json(exception.getResponse());
    } else {
      // Handle other unprepared exceptions as `InternalServerErrorException`.
      const internalServerError = new InternalServerErrorException(UNEXPECTED_ERROR);

      response.status(internalServerError.getStatus()).json(internalServerError.getResponse());
    }
  }
}
