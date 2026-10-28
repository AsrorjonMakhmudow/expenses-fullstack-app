import { z } from 'zod';
import { parseIsoDatePrefix } from '../../lib/date.js';
import { issueMessage, parseExpenseText } from '../lib/parse-expense-text.js';
import type {
  ExpenseSourceParser,
  ParseIssue,
  ParseResult,
  ParsedExpense,
} from '../model/types.js';

/*
 * Telegram Desktop → "Export chat history" → JSON produces `result.json`.
 * We describe ONLY the fields we use. Zod checks the shape at runtime, because a file from
 * outside is untrusted: TypeScript types alone disappear after compilation.
 *
 * `text` is a plain string, OR an array when the message has formatting/hashtags/links:
 *   ["400.000 — ", { "type": "hashtag", "text": "#1" }, " Фильтр сув ..."]
 */
const TextPartSchema = z.union([z.string(), z.object({ text: z.string() })]);

const MessageSchema = z.object({
  id: z.number(),
  type: z.string(),
  date: z.string(),
  text: z.union([z.string(), z.array(TextPartSchema)]).optional(),
});

/** Export of one chat (what you get from Saved Messages → ⋮ → Export chat history). */
const SingleChatExportSchema = z.object({ messages: z.array(MessageSchema) });

/** Full account export (Settings → Advanced → Export Telegram data). */
const FullExportSchema = z.object({
  chats: z.object({
    list: z.array(z.object({ type: z.string(), messages: z.array(MessageSchema) })),
  }),
});

type TelegramMessage = z.infer<typeof MessageSchema>;

function messageText(message: TelegramMessage): string {
  const { text } = message;
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  return text.map((part) => (typeof part === 'string' ? part : part.text)).join('');
}

function extractMessages(json: unknown): TelegramMessage[] | null {
  const single = SingleChatExportSchema.safeParse(json);
  if (single.success) return single.data.messages;

  const full = FullExportSchema.safeParse(json);
  if (full.success) {
    return full.data.chats.list
      .filter((chat) => chat.type === 'saved_messages')
      .flatMap((chat) => chat.messages);
  }
  return null;
}

function invalidFile(detail: string): ParseResult {
  return {
    expenses: [],
    issues: [
      {
        severity: 'error',
        code: 'INVALID_FILE',
        message: `${issueMessage('INVALID_FILE')} ${detail}`,
      },
    ],
    skippedMessages: 0,
  };
}

export const telegramJsonParser: ExpenseSourceParser = {
  id: 'telegram-json',
  label: 'Telegram export (result.json)',

  canParse: ({ fileName }) => /\.json$/i.test(fileName),

  parse: ({ content }) => {
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      return invalidFile('It is not valid JSON.');
    }

    const messages = extractMessages(json);
    if (messages === null) {
      return invalidFile('It does not look like a Telegram Desktop JSON export.');
    }

    const expenses: ParsedExpense[] = [];
    const issues: ParseIssue[] = [];
    let skippedMessages = 0;

    for (const message of messages) {
      if (message.type !== 'message') {
        skippedMessages += 1; // service messages: "pinned a message", etc.
        continue;
      }

      const fallbackDate = parseIsoDatePrefix(message.date) ?? undefined;
      const result = parseExpenseText(messageText(message), {
        ...(fallbackDate !== undefined && { fallbackDate }),
        sourceMessageId: message.id,
      });

      // Saved Messages also contain links, photos and random notes. If nothing in the message
      // looks like a date or an expense, it is not an expense note: skip it silently
      // instead of flooding the report with "unrecognized line" errors.
      if (!result.looksLikeExpenseNote) {
        skippedMessages += 1;
        continue;
      }

      expenses.push(...result.expenses);
      issues.push(...result.issues);
    }

    return { expenses, issues, skippedMessages };
  },
};
