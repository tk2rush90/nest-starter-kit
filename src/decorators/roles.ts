import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { AccountRole } from '../types/account-role';

/** Key for Roles metadata */
export const ROLES_KEY = 'roles';

/** Decorator to set required roles for auth guard */
export const Roles = (...roles: AccountRole[]): CustomDecorator => SetMetadata(ROLES_KEY, roles);
