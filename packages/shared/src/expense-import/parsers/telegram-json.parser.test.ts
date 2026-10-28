import { describe, expect, it } from 'vitest';
import { telegramJsonParser } from './telegram-json.parser.js';

const input = (json: unknown) => ({ fileName: 'result.json', content: JSON.stringify(json) });

describe('telegramJsonParser', () => {
  it('parses a single-chat export, joining formatted text parts (hashtags)', () => {
    const result = telegramJsonParser.parse(
      input({
        name: 'Saved Messages',
        type: 'saved_messages',
        messages: [
          {
            id: 101,
            type: 'message',
            date: '2026-10-04T21:15:00',
            text: [
              '04.10.2026\n400.000 — ',
              { type: 'hashtag', text: '#1' },
              ' Фильтр сув биринчи ойлигини туладим',
            ],
          },
        ],
      }),
    );

    expect(result.issues).toEqual([]);
    expect(result.expenses).toMatchObject([
      {
        date: '2026-10-04',
        amount: 400_000,
        description: '#1 Фильтр сув биринчи ойлигини туладим',
        sourceMessageId: 101,
      },
    ]);
  });

  it('skips messages that are not expense notes (links, photos, service messages)', () => {
    const result = telegramJsonParser.parse(
      input({
        messages: [
          { id: 1, type: 'service', date: '2026-10-01T10:00:00', text: '' },
          { id: 2, type: 'message', date: '2026-10-01T10:00:00', text: 'https://example.com' },
          { id: 3, type: 'message', date: '2026-10-01T10:00:00' }, // photo without caption
          { id: 4, type: 'message', date: '2026-10-01T10:00:00', text: '01.10.2026\n5.000 - нон' },
        ],
      }),
    );

    expect(result.expenses).toHaveLength(1);
    expect(result.issues).toEqual([]);
    expect(result.skippedMessages).toBe(3);
  });

  it('falls back to the message date when a message has no date line', () => {
    const result = telegramJsonParser.parse(
      input({
        messages: [{ id: 7, type: 'message', date: '2026-10-05T09:00:00', text: '5.000 - нон' }],
      }),
    );
    expect(result.expenses[0]).toMatchObject({ date: '2026-10-05', sourceMessageId: 7 });
    expect(result.issues).toMatchObject([{ code: 'DATE_FROM_MESSAGE', sourceMessageId: 7 }]);
  });

  it('reads Saved Messages from a full account export', () => {
    const result = telegramJsonParser.parse(
      input({
        chats: {
          list: [
            {
              type: 'personal_chat',
              messages: [
                {
                  id: 1,
                  type: 'message',
                  date: '2026-10-01T10:00:00',
                  text: '01.10.2026\n9.000 - x',
                },
              ],
            },
            {
              type: 'saved_messages',
              messages: [
                {
                  id: 2,
                  type: 'message',
                  date: '2026-10-01T10:00:00',
                  text: '01.10.2026\n5.000 - нон',
                },
              ],
            },
          ],
        },
      }),
    );
    expect(result.expenses.map((e) => e.amount)).toEqual([5_000]);
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong shape', JSON.stringify({ hello: 'world' })],
  ])('reports an invalid file: %s', (_name, content) => {
    const result = telegramJsonParser.parse({ fileName: 'result.json', content });
    expect(result.expenses).toEqual([]);
    expect(result.issues).toMatchObject([{ severity: 'error', code: 'INVALID_FILE' }]);
  });
});
