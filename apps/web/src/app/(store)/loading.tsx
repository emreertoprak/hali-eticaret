export default function Loading() {
  return (
    <div className="container-page grid grid-cols-2 gap-4 py-10 lg:grid-cols-4" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-cream" />
      ))}
    </div>
  );
}
