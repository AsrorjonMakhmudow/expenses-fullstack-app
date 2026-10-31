interface YearSelectProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

/** Choose which year the dashboard shows. */
export function YearSelect({ years, value, onChange }: YearSelectProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      Year
      <select
        className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
