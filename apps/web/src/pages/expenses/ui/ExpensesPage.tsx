import { AddExpenseForm } from '@/features/add-expense';
import { Card } from '@/shared/ui';
import { ExpensesTable } from '@/widgets/expenses-table';

export function ExpensesPage() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <h1 className="text-2xl font-semibold">Expenses</h1>
      <Card title="Add an expense">
        <AddExpenseForm />
      </Card>
      <ExpensesTable />
    </div>
  );
}
