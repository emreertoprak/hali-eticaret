import { formatPrice } from '@/lib/format';

export function Price({
  price,
  oldPrice,
  size = 'md',
  prefix,
}: {
  price: number;
  oldPrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  prefix?: string;
}) {
  const main = { sm: 'text-[15px]', md: 'text-[17px]', lg: 'text-[28px]' }[size];
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={`${main} font-extrabold text-ink`}>
        {prefix && <span className="mr-1 text-[0.7em] font-semibold text-muted">{prefix}</span>}
        {formatPrice(price)}
      </span>
      {oldPrice ? <span className="text-[13px] text-muted line-through">{formatPrice(oldPrice)}</span> : null}
    </div>
  );
}
