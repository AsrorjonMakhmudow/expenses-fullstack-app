import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const pipe = new ZodValidationPipe(z.object({ amount: z.number().int().positive() }));

describe('ZodValidationPipe', () => {
  it('returns parsed data when valid', () => {
    expect(pipe.transform({ amount: 5, extra: 'dropped' })).toEqual({ amount: 5 });
  });

  it('throws 400 with field paths when invalid', () => {
    try {
      pipe.transform({ amount: -1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: 'Validation failed',
        errors: [{ path: 'amount' }],
      });
    }
  });
});
