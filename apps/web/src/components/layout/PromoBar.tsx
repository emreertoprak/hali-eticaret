import type { Announcement } from '@/lib/types';

/** "10.000 TL Üzerine 3" gibi rakamları vurgular. */
function highlightNumbers(text: string) {
  return text.split(/(\b\d+\b)(?= Taksit| ve|!|,|$)/).map((part, i) =>
    /^\d+$/.test(part) ? (
      <strong key={i} className="font-extrabold">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export function PromoBar({ item }: { item?: Announcement }) {
  if (!item) return null;
  return (
    <div className="bg-gold text-center text-[13px] font-semibold text-ink">
      <p className="container-page py-2">{highlightNumbers(item.text)}</p>
    </div>
  );
}
