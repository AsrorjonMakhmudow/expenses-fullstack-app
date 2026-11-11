import { hash, verify } from '@node-rs/argon2';

/** Abstract so unit tests can use a fast fake (real argon2 is slow on purpose). */
export abstract class PasswordHasher {
  abstract hash(password: string): Promise<string>;
  abstract verify(passwordHash: string, password: string): Promise<boolean>;
}

/**
 * argon2id with the OWASP-recommended minimum: 19 MiB memory, 2 passes, 1 lane.
 * "Memory-hard": guessing passwords on GPUs is expensive even if the database leaks.
 * The parameters are stored inside each hash, so raising them later keeps old hashes valid.
 */
export class Argon2PasswordHasher extends PasswordHasher {
  private static readonly OPTIONS = {
    algorithm: 2, // Algorithm.Argon2id (a const enum in the library's types)
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  } as const;

  hash(password: string): Promise<string> {
    return hash(password, Argon2PasswordHasher.OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false; // malformed hash → never a match
    }
  }
}
