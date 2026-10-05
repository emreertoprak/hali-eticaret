import Link from 'next/link';

export function SectionHeading({ eyebrow, title, href, linkLabel = 'Tümünü Gör' }: { eyebrow?: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div>
        {eyebrow && <p className="label-eyebrow mb-1 text-brand-red">{eyebrow}</p>}
        <h2 className="font-serif text-[26px] leading-tight font-semibold md:text-[36px]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-[14px] font-bold underline-offset-4 hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
