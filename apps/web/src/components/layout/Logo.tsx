import Link from 'next/link';

/** Konturlu geometrik wordmark (marka adı backend config'inden gelir). */
export function Logo({ name, className = '' }: { name: string; className?: string }) {
  return (
    <Link href="/" aria-label={`${name} ana sayfa`} className={`group inline-flex items-center ${className}`}>
      <span
        className="font-serif text-[26px] leading-none font-semibold tracking-[0.18em] text-transparent uppercase transition-colors group-hover:text-ink/5 md:text-[32px]"
        style={{ WebkitTextStroke: '1.4px #1f1f1f' }}
      >
        {name}
      </span>
    </Link>
  );
}
