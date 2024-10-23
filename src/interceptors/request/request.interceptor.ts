import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  private readonly _logger = new Logger('RequestInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: Request = context.switchToHttp().getRequest();

    this._logger.log(`${request.method.toUpperCase()} ${request.url}`);
    this._logger.log(`Query: ${JSON.stringify(request.query)}`);
    this._logger.log(`Param: ${JSON.stringify(request.params)}`);
    this._logger.log(`Body: ${JSON.stringify(request.body)}`);

    return next.handle();
  }
}
