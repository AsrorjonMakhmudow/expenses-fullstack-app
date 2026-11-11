/**
 * pnpm auth:set-password you@example.com
 *
 * Sets (or resets) a user's password from the terminal; creates the user if the email is new.
 * Main use: the account that owned all data before sign-in existed (ADR 0009) — it keeps its
 * expenses and simply gets a password. Also signs that user out everywhere.
 *
 * The password is typed hidden, twice, never passed as an argument (shell history!).
 */
import { createInterface } from 'node:readline';
import { EmailSchema, NewPasswordSchema } from '@expenses/shared';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { ROOT_ENV_FILE, validateEnv } from '../config/env.js';
import { schema, sessions, users } from '../infra/database/schema.js';
import { Argon2PasswordHasher } from '../modules/auth/password-hasher.js';

async function main(): Promise<void> {
  const email = EmailSchema.safeParse(process.argv[2] ?? '');
  if (!email.success) fail('Usage: pnpm auth:set-password <email>');

  try {
    process.loadEnvFile(ROOT_ENV_FILE);
  } catch {
    // no .env — variables come from the environment
  }
  const env = validateEnv(process.env);

  const lines = createLineReader();
  const password = await lines.ask('New password: ', true);
  const again = await lines.ask('Repeat it:    ', true);
  lines.close();

  if (password !== again) fail('The two passwords are different.');
  const valid = NewPasswordSchema.safeParse(password);
  if (!valid.success) fail(valid.error.issues[0]?.message ?? 'Invalid password');
  if (password.trim().toLowerCase() === email.data) fail('Password must not be your email.');

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });
  try {
    const db = drizzle(pool, { schema });
    const passwordHash = await new Argon2PasswordHasher().hash(password);
    // One transaction: either the password is set AND old sessions are gone, or nothing changes.
    const existed = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.data));
      const [user] = await tx
        .insert(users)
        .values({ email: email.data, passwordHash })
        .onConflictDoUpdate({ target: users.email, set: { passwordHash } })
        .returning({ id: users.id });
      if (!user) throw new Error('Could not save the user.');
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
      return Boolean(existing);
    });
    // eslint-disable-next-line no-console -- a CLI talks to the terminal
    console.log(
      existed
        ? `✓ Password updated for ${email.data} (signed out everywhere).`
        : `✓ New user ${email.data} created with this password.`,
    );
  } catch (error) {
    if (pgErrorCode(error) === UNDEFINED_TABLE) {
      fail('The database is missing tables. Run `pnpm db:migrate` first, then try again.');
    }
    throw error;
  } finally {
    await pool.end();
  }
}

/** PostgreSQL "relation does not exist" — a migration hasn't been applied. */
const UNDEFINED_TABLE = '42P01';

/** Drizzle wraps the driver error in `cause`; look at both levels. */
function pgErrorCode(error: unknown): string | undefined {
  for (let e: unknown = error; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Reads answers line by line; on a real terminal the typed characters are hidden. */
function createLineReader() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY,
  });
  const pending: string[] = [];
  const waiting: ((line: string) => void)[] = [];
  let hidden = false;
  rl.on('line', (line) => {
    const next = waiting.shift();
    if (next) next(line);
    else pending.push(line);
  });
  // Echo nothing while a hidden answer is typed (the prompt itself is still shown).
  const output = rl as unknown as { _writeToOutput: (text: string) => void };
  const write = output._writeToOutput.bind(rl);
  output._writeToOutput = (text) => {
    if (!hidden || text.endsWith(': ')) write(text);
  };

  return {
    ask(question: string, hide: boolean): Promise<string> {
      hidden = hide;
      process.stdout.write(question);
      const line = pending.shift();
      const answer =
        line !== undefined ? Promise.resolve(line) : new Promise<string>((r) => waiting.push(r));
      return answer.then((value) => {
        if (hide) process.stdout.write('\n');
        hidden = false;
        return value;
      });
    },
    close: () => rl.close(),
  };
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

await main();
