import { ValidateIf, ValidationOptions } from 'class-validator';

/**
 * A decorator for `class-validator` which allows `null` value.
 * @param validationOptions
 * @constructor
 */
export function IsNullable(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateIf((_object, value) => value !== null, validationOptions);
}
