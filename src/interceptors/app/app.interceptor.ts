import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AppInterceptor implements NestInterceptor {
  private readonly _logger = new Logger('AppInterceptor');

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.switchToHttp().getRequest() as Request;

    this._logger.log(`Request: ${request.method} ${request.url} - ${JSON.stringify(request.body)}`);

    return next.handle();
  }
}
