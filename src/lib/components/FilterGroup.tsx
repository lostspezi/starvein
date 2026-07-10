"use client";

/** Button-Gruppe für URL-State-Filter (nuqs) — geteilt zwischen Slices. */
export function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  optionLabel,
  allLabel,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
  optionLabel: (option: T) => string;
  allLabel: string;
}) {
  const baseClass = "rounded px-2 py-1 text-sm transition-all duration-150";
  const activeClass = `${baseClass} bg-bg-nebula-2 font-medium text-accent-cyan shadow-glow-sm`;
  const inactiveClass = `${baseClass} text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary`;

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      <button
        type="button"
        data-value="all"
        onClick={() => onChange(null)}
        className={value === null ? activeClass : inactiveClass}
      >
        {allLabel}
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-value={option}
          onClick={() => onChange(option)}
          className={value === option ? activeClass : inactiveClass}
        >
          {optionLabel(option)}
        </button>
      ))}
    </div>
  );
}
