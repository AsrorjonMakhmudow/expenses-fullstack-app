import { z } from 'zod';

/*
 * The API CONTRACT for sign-up / sign-in (see docs/adr/0009).
 * The web forms validate with the same schemas the API enforces.
 */

/** Long enough to resist guessing; capped so hashing a huge "password" can't be used for DoS. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** Trimmed + lower case: "Me@Mail.com " and "me@mail.com" are the same account. */
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: 'Enter a valid email address' }));

export const NewPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `At most ${PASSWORD_MAX_LENGTH} characters`);

export const RegisterSchema = z
  .object({ email: EmailSchema, password: NewPasswordSchema })
  .refine((v) => v.password.trim().toLowerCase() !== v.email, {
    message: 'Password must not be your email',
    path: ['password'],
  });
export type RegisterInput = z.output<typeof RegisterSchema>;

/** Sign-in checks only the shape: the password rules may change, old passwords must still work. */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.output<typeof LoginSchema>;

/** GET /auth/me, and the body of a successful register / login. */
export interface UserDto {
  id: string;
  email: string;
}

export interface AuthConfigDto {
  /** false → the sign-up page says registration is closed. */
  registrationEnabled: boolean;
}
