import Link from 'next/link';

export function EmptyState({ title, text, href, cta }: { title: string; text?: string; href?: string; cta?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div className="story-ring mb-5 grid size-20 place-items-center rounded-full p-[2.5px]">
        <div className="size-full rounded-full border-2 border-cream bg-[repeating-linear-gradient(45deg,#f3f1ec_0_8px,#e8e6df_8px_16px)]" />
      </div>
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      {text && <p className="mt-2 text-muted">{text}</p>}
      {href && cta && (
        <Link href={href} className="btn-primary mt-6">
          {cta}
        </Link>
      )}
    </div>
  );
}
