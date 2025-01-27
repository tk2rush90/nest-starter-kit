import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AccountService } from '../../shared/account/account.service';
import { Request } from 'express';
import { SIGN_REQUIRED } from '../../constants/errors';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../decorators/roles';
import { AccountRole } from '../../types/account-role';

/** Basic guard to check validity of access token in Authorization header */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly _logger = new Logger('AuthGuard');

  constructor(
    private readonly _reflector: Reflector,
    private readonly _accountService: AccountService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles.
    // When it's empty, there will be no role restriction.
    const roles = this._reflector.get<AccountRole[]>(ROLES_KEY, context.getHandler()) || [];

    // Switch context to `Request`.
    const request: Request = context.switchToHttp().getRequest();

    // Get access token from header.
    const accessToken = request.header('Authorization');

    // Validate.
    if (accessToken) {
      // Validate and get account.
      const account = await this._accountService.validateAccessToken(accessToken);

      // When `roles` array has items, validate roles.
      if (roles.length > 0) {
        throw new Error('Implement features to handle role check');
      }

      return true;
    } else {
      throw new UnauthorizedException(SIGN_REQUIRED);
    }
  }
}
