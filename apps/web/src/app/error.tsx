'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold">Bir şeyler ters gitti</h1>
      <p className="mt-2 text-muted">Sayfa yüklenirken bir hata oluştu. Lütfen tekrar deneyin.</p>
      <button className="btn-primary mt-6" onClick={reset}>
        Tekrar Dene
      </button>
    </div>
  );
}
