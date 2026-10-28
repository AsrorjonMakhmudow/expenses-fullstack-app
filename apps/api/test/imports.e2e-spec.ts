import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { DB } from '../src/infra/database/database.module.js';
import type { Database } from '../src/infra/database/database.module.js';

// A small Telegram Desktop export, shaped like the real result.json.
const telegramExport = (messages: object[]) =>
  Buffer.from(JSON.stringify({ name: 'Saved Messages', type: 'saved_messages', messages }));

const OCTOBER = telegramExport([
  {
    id: 1,
    type: 'message',
    date: '2026-10-04T21:15:00',
    text: [
      '04.10.2026\n65.000 - билайн номеримга ташадим\n400.000 — ',
      { type: 'hashtag', text: '#1' },
      ' Фильтр сув биринчи ойлигини туладим\n5.000 - нон\n5.000 - нон\n1.5 - такси',
    ],
  },
  { id: 2, type: 'message', date: '2026-10-04T22:00:00', text: 'https://example.com' },
]);

describe('Imports API (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>());
    await app.init();
    http = request(app.getHttpServer());
  });

  beforeEach(async () => {
    await app.get<Database>(DB).execute(sql`truncate table import_batches, expenses`);
  });

  afterAll(async () => {
    await app.close();
  });

  const upload = (path: string, file: Buffer, name = 'result.json') =>
    http.post(`/api/v1/imports${path}`).attach('file', file, name);

  it('preview → commit → re-import skipped → undo', async () => {
    // 1. Preview: nothing saved
    const preview = await upload('/preview', OCTOBER).expect(200);
    expect(preview.body.parser.id).toBe('telegram-json');
    expect(preview.body.summary).toMatchObject({
      parsed: 4,
      new: 4,
      errors: 1,
      skippedMessages: 1,
      newAmount: 475_000,
    });
    expect((await http.get('/api/v1/expenses')).body.total).toBe(0);

    // 2. Commit: saved, with the right source
    const batch = await upload('', OCTOBER).expect(201);
    expect(batch.body.summary).toMatchObject({ new: 4, duplicates: 0 });
    const list = await http.get('/api/v1/expenses').expect(200);
    expect(list.body.total).toBe(4);
    expect(list.body.items[0].source).toBe('telegram_import');

    // 3. Same file again: everything is a duplicate
    const again = await upload('/preview', OCTOBER).expect(200);
    expect(again.body.summary).toMatchObject({ new: 0, duplicates: 4 });
    await upload('', OCTOBER).expect(409);

    // 4. History and undo
    const history = await http.get('/api/v1/imports').expect(200);
    expect(history.body).toHaveLength(1);
    await http.delete(`/api/v1/imports/${batch.body.id}`).expect(204);
    expect((await http.get('/api/v1/expenses')).body.total).toBe(0);
  });

  it('rejects a missing file, Word files and broken JSON', async () => {
    await http.post('/api/v1/imports/preview').expect(400);
    await upload('/preview', Buffer.from('x'), 'october.docx').expect(400);
    const broken = await upload('/preview', Buffer.from('{oops')).expect(200);
    expect(broken.body.issues).toMatchObject([{ code: 'INVALID_FILE' }]);
  });
});
