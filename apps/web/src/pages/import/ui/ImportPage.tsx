import { ImportWizard } from '@/features/import-expenses';
import { ImportHistory } from '@/widgets/import-history';

export function ImportPage() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <h1 className="text-2xl font-semibold">Import from Telegram</h1>
      <ImportWizard />
      <ImportHistory />
    </div>
  );
}
