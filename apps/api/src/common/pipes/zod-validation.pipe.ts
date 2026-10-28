import { BadRequestException } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * A Nest "pipe" runs BEFORE the controller method: it checks and converts the input.
 * If the input is wrong, the controller is never called and the client gets 400.
 *
 * Usage: @Body(new ZodValidationPipe(CreateExpenseSchema)) body: CreateExpenseInput
 *
 * The schemas live in @expenses/shared, so the web app validates with the SAME rules.
 * Client-side validation is only for UX; THIS is the security boundary.
 */
export class ZodValidationPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
