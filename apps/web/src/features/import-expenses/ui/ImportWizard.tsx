import { MAX_IMPORT_FILE_BYTES } from '@expenses/shared';
import type { ImportPreviewDto } from '@expenses/shared';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { formatDate, formatSom } from '@/shared/lib';
import { Button, Card, ErrorMessage, Spinner } from '@/shared/ui';
import { useCommitImport, usePreviewImport } from '../model/use-import-expenses';

const MAX_ISSUES_SHOWN = 200;

/**
 * Upload → Preview → Import.
 * The preview shows totals and EVERY line the parser couldn't read, so you can fix them in
 * Telegram (or accept them) before anything is saved.
 */
export function ImportWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [tooBig, setTooBig] = useState(false);
  const preview = usePreviewImport();
  const commit = useCommitImport();

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    commit.reset();
    preview.reset();
    setFile(chosen);
    // Check size in the browser first (instant feedback). The server enforces it anyway.
    const isTooBig = !!chosen && chosen.size > MAX_IMPORT_FILE_BYTES;
    setTooBig(isTooBig);
    if (chosen && !isTooBig) preview.mutate(chosen);
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card title="1. Choose your Telegram export">
        <p className="mb-3 text-sm text-ink-2">
          Telegram Desktop → Saved Messages → ⋮ → Export chat history → format <b>JSON</b>. Then
          pick <code>result.json</code> here (a <code>.txt</code> file works too).
        </p>
        <input
          type="file"
          accept=".json,.txt"
          onChange={handleFile}
          className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-white"
        />
        {tooBig && (
          <p role="alert" className="mt-2 text-sm text-danger">
            The file is larger than {MAX_IMPORT_FILE_BYTES / 1024 / 1024} MB.
          </p>
        )}
      </Card>

      {preview.isPending && <Spinner label="Reading your file…" />}
      {preview.error && <ErrorMessage error={preview.error} />}

      {preview.data && file && (
        <PreviewResult
          preview={preview.data}
          importing={commit.isPending}
          done={commit.isSuccess}
          onImport={() => commit.mutate(file)}
        />
      )}
      {commit.error && <ErrorMessage error={commit.error} />}
      {commit.data && (
        <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">
          Imported {commit.data.summary.new} expenses ({formatSom(commit.data.summary.newAmount)}).
          {commit.data.summary.duplicates > 0 &&
            ` Skipped ${commit.data.summary.duplicates} already imported.`}
        </p>
      )}
    </div>
  );
}

function PreviewResult({
  preview,
  importing,
  done,
  onImport,
}: {
  preview: ImportPreviewDto;
  importing: boolean;
  done: boolean;
  onImport: () => void;
}) {
  const { summary, issues } = preview;
  const example = preview.expenses.find((e) => !e.duplicate);

  return (
    <Card title="2. Check the preview">
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="New expenses" value={String(summary.new)} />
        <Stat label="New total" value={formatSom(summary.newAmount)} />
        <Stat label="Already imported" value={String(summary.duplicates)} />
        <Stat label="Lines with problems" value={String(summary.errors)} />
      </dl>
      {summary.firstDate && summary.lastDate && (
        <p className="mb-4 text-sm text-ink-2">
          From {formatDate(summary.firstDate)} to {formatDate(summary.lastDate)} · parser:{' '}
          {preview.parser.label} · {summary.skippedMessages} non-expense messages skipped
        </p>
      )}

      {issues.length > 0 && (
        <details className="mb-4" open={issues.length <= 20}>
          <summary className="cursor-pointer text-sm font-medium">
            {issues.length} problem lines (not imported unless marked “warning”)
          </summary>
          <ul className="mt-2 max-h-64 overflow-auto rounded-lg border border-line text-sm">
            {issues.slice(0, MAX_ISSUES_SHOWN).map((issue, index) => (
              <li key={index} className="flex gap-3 border-b border-line px-3 py-1.5 last:border-0">
                <span className={issue.severity === 'error' ? 'text-danger' : 'text-ink-2'}>
                  {issue.severity}
                </span>
                <code className="flex-1 truncate">{issue.rawLine ?? issue.message}</code>
                <span className="text-ink-3">{issue.code}</span>
              </li>
            ))}
          </ul>
          {issues.length > MAX_ISSUES_SHOWN && (
            <p className="mt-1 text-xs text-ink-3">…and {issues.length - MAX_ISSUES_SHOWN} more.</p>
          )}
        </details>
      )}

      {example && (
        <p className="mb-4 text-sm text-ink-2">
          Example: {formatDate(example.date)} · {formatSom(example.amount)} · {example.description}
        </p>
      )}

      <Button onClick={onImport} disabled={importing || done || summary.new === 0}>
        {importing
          ? 'Importing…'
          : summary.new === 0
            ? 'Nothing new to import'
            : `3. Import ${summary.new} expenses`}
      </Button>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-page p-3">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-base font-semibold">{value}</dd>
    </div>
  );
}
