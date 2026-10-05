import { Minus, Plus } from 'lucide-react';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  disabled,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const h = size === 'sm' ? 'h-9' : 'h-12';
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-line bg-white`}>
      <button
        type="button"
        aria-label="Azalt"
        className="grid h-full w-10 place-items-center disabled:opacity-30"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Artır"
        className="grid h-full w-10 place-items-center disabled:opacity-30"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
