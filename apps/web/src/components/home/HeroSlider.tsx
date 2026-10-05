'use client';

import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import type { Banner } from '@/lib/types';

export function HeroSlider({ banners }: { banners: Banner[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 6000, stopOnInteraction: false })]);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(true);

  const onSelect = useCallback(() => embla && setSelected(embla.selectedScrollSnap()), [embla]);
  useEffect(() => {
    if (!embla) return;
    embla.on('select', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, onSelect]);

  const togglePlay = () => {
    const autoplay = embla?.plugins().autoplay;
    if (!autoplay) return;
    if (playing) autoplay.stop();
    else autoplay.play();
    setPlaying(!playing);
  };

  if (!banners.length) return null;

  return (
    <section aria-roledescription="carousel" aria-label="Kampanyalar" className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((b, i) => (
            <div key={b.id} className="relative h-[420px] min-w-0 flex-[0_0_100%] md:h-[560px]" aria-roledescription="slide" aria-label={`${i + 1} / ${banners.length}`}>
              <Image src={b.imageUrl} alt="" fill priority={i === 0} unoptimized sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <p className="label-eyebrow mb-3 text-gold">{b.subtitle}</p>
                <h2
                  className="max-w-4xl font-serif text-[40px] leading-[1.05] font-semibold tracking-wide md:text-[84px]"
                  style={{
                    backgroundImage: 'linear-gradient(180deg,#fff3c4 0%,#f4bf44 45%,#b8862b 100%)',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.45))',
                  }}
                >
                  {b.title}
                </h2>
                {b.ctaUrl && (
                  <Link href={b.ctaUrl} className="btn-primary mt-8">
                    {b.ctaText ?? 'Tümünü Gör'}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button aria-label="Önceki" onClick={() => embla?.scrollPrev()} className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow-card hover:bg-white md:grid">
        <ChevronLeft size={20} />
      </button>
      <button aria-label="Sonraki" onClick={() => embla?.scrollNext()} className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow-card hover:bg-white md:grid">
        <ChevronRight size={20} />
      </button>

      <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2">
        <button aria-label={playing ? 'Durdur' : 'Oynat'} onClick={togglePlay} className="mr-1 text-white/90">
          {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        {banners.map((b, i) => (
          <button
            key={b.id}
            aria-label={`${i + 1}. slayta git`}
            aria-current={i === selected}
            onClick={() => embla?.scrollTo(i)}
            className={`size-2.5 rounded-full transition ${i === selected ? 'bg-white ring-4 ring-white/30' : 'bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </section>
  );
}
