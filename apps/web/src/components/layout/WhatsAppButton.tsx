export function WhatsAppIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M16.02 3C8.84 3 3 8.83 3 16c0 2.29.6 4.53 1.75 6.5L3 29l6.68-1.74A13 13 0 0 0 16.02 29C23.2 29 29 23.17 29 16S23.2 3 16.02 3Zm0 23.6c-2.04 0-4.04-.55-5.78-1.6l-.41-.25-3.96 1.03 1.06-3.86-.27-.4A10.56 10.56 0 0 1 5.4 16c0-5.85 4.77-10.6 10.62-10.6 5.84 0 10.6 4.75 10.6 10.6 0 5.85-4.76 10.6-10.6 10.6Zm5.82-7.94c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59a9.6 9.6 0 0 1-1.78-2.2c-.19-.32-.02-.5.14-.65.14-.15.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.53-.54-.72-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.2 2 .12.61-.09 1.89-.77 2.15-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

export function WhatsAppButton({ phone }: { phone: string }) {
  return (
    <a
      href={`https://wa.me/${phone}?text=${encodeURIComponent('Merhaba, halılarınız hakkında bilgi almak istiyorum.')}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ile yazın"
      className="fixed right-4 bottom-4 z-[90] grid size-14 place-items-center rounded-full bg-whatsapp text-white shadow-whatsapp transition hover:scale-105 md:right-6 md:bottom-6"
    >
      <span className="absolute inset-0 rounded-full bg-whatsapp opacity-60 motion-safe:animate-[ping-soft_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
      <span className="relative">
        <WhatsAppIcon />
      </span>
    </a>
  );
}
