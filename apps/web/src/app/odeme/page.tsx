'use client';

import { Check, CreditCard, Landmark, Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CartSummary } from '@/components/cart/CartSummary';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { RequireAuth } from '@/components/ui/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { ApiError } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { Address, Order } from '@/lib/types';

const STEPS = ['Sepet', 'Adres & Ödeme', 'Onay'];

function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2 text-[13px] font-semibold md:gap-4">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2 md:gap-4">
          <span className={`grid size-7 place-items-center rounded-full ${i <= current ? 'bg-charcoal text-white' : 'bg-cream text-muted'}`}>
            {i < current ? <Check size={14} /> : i + 1}
          </span>
          <span className={i <= current ? '' : 'text-muted'}>{s}</span>
          {i < STEPS.length - 1 && <span className="h-px w-6 bg-line md:w-12" />}
        </li>
      ))}
    </ol>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold">{label}</span>
      <input name={name} required className="input" {...props} />
    </label>
  );
}

function Checkout() {
  const { authFetch, user } = useAuth();
  const { cart, reload } = useCart();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<number | 'new'>('new');
  const [method, setMethod] = useState<'card' | 'bank_transfer'>('card');
  const [installment, setInstallment] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    authFetch<Address[]>('/addresses')
      .then((list) => {
        setAddresses(list);
        if (list.length) setAddressId(list.find((a) => a.isDefault)?.id ?? list[0].id);
      })
      .catch(() => setAddresses([]));
  }, [authFetch]);

  if (!cart) return <p className="py-16 text-center text-muted">Yükleniyor…</p>;
  if (!cart.items.length) return <EmptyState title="Sepetiniz boş" text="Ödeme adımına geçmek için sepetinize ürün ekleyin." href="/urunler" cta="Alışverişe Başla" />;

  const installmentOptions = [1, 3, 5];

  const submit = async (form: HTMLFormElement) => {
    const d = new FormData(form);
    const s = (k: string) => String(d.get(k) ?? '').trim();
    setPending(true);
    setError(null);
    try {
      let chosenAddressId = addressId === 'new' ? undefined : addressId;
      const addressInput = {
        fullName: s('fullName'),
        phone: s('phone'),
        city: s('city'),
        district: s('district'),
        addressLine: s('addressLine'),
      };
      if (addressId === 'new' && d.get('saveAddress')) {
        const saved = await authFetch<Address>('/addresses', { method: 'POST', body: JSON.stringify({ ...addressInput, title: s('title') || 'Ev' }) });
        chosenAddressId = saved.id;
      }
      const order = await authFetch<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...(chosenAddressId ? { addressId: chosenAddressId } : { address: addressInput }),
          paymentMethod: method,
          installmentCount: method === 'card' ? installment : 1,
          ...(method === 'card' ? { card: { holderName: s('holderName'), number: s('cardNumber'), expiry: s('expiry'), cvv: s('cvv') } } : {}),
          note: s('note') || undefined,
          acceptTerms: Boolean(d.get('acceptTerms')),
        }),
      });
      await reload();
      router.push(`/siparis/${order.orderNo}?yeni=1`);
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
        setError(fields ? (Object.values(fields).flat()[0] ?? err.message) : err.message);
      } else setError('Sipariş oluşturulamadı.');
      setPending(false);
    }
  };

  return (
    <form
      className="grid gap-8 lg:grid-cols-[1fr_400px]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <div className="space-y-8">
        <section className="rounded-xl border border-line bg-white p-5 md:p-7">
          <h2 className="mb-4 text-lg font-bold">Teslimat Adresi</h2>
          {addresses && addresses.length > 0 && (
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <label key={a.id} className={`cursor-pointer rounded-lg border-[1.5px] p-4 text-[14px] ${addressId === a.id ? 'border-ink bg-cream' : 'border-line'}`}>
                  <input type="radio" name="addr" className="sr-only" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  <span className="block font-bold">{a.title}</span>
                  <span className="block text-muted">
                    {a.fullName} · {a.phone}
                  </span>
                  <span className="block text-muted">
                    {a.addressLine}, {a.district}/{a.city}
                  </span>
                </label>
              ))}
              <label className={`grid cursor-pointer place-items-center rounded-lg border-[1.5px] border-dashed p-4 text-[14px] font-bold ${addressId === 'new' ? 'border-ink bg-cream' : 'border-line'}`}>
                <input type="radio" name="addr" className="sr-only" checked={addressId === 'new'} onChange={() => setAddressId('new')} />+ Yeni Adres
              </label>
            </div>
          )}
          {addressId === 'new' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ad Soyad" name="fullName" autoComplete="name" defaultValue={user ? `${user.firstName} ${user.lastName}` : ''} />
              <Field label="Telefon" name="phone" type="tel" autoComplete="tel" defaultValue={user?.phone ?? ''} placeholder="5XX XXX XX XX" />
              <Field label="İl" name="city" autoComplete="address-level1" />
              <Field label="İlçe" name="district" autoComplete="address-level2" />
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[13px] font-semibold">Açık Adres</span>
                <textarea name="addressLine" required minLength={10} rows={3} className="input" autoComplete="street-address" />
              </label>
              <label className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" name="saveAddress" defaultChecked className="size-4 accent-charcoal" /> Adresi kaydet
              </label>
              <input name="title" placeholder="Adres başlığı (Ev, İş…)" className="input" aria-label="Adres başlığı" required={false} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-line bg-white p-5 md:p-7">
          <h2 className="mb-4 text-lg font-bold">Ödeme</h2>
          <div className="mb-5 grid grid-cols-2 gap-3">
            {[
              ['card', 'Kredi / Banka Kartı', CreditCard],
              ['bank_transfer', 'Havale / EFT', Landmark],
            ].map(([value, label, Icon]) => {
              const I = Icon as typeof CreditCard;
              return (
                <label key={value as string} className={`flex cursor-pointer items-center gap-2 rounded-lg border-[1.5px] p-4 text-[14px] font-bold ${method === value ? 'border-ink bg-cream' : 'border-line'}`}>
                  <input type="radio" name="method" className="sr-only" checked={method === value} onChange={() => setMethod(value as 'card' | 'bank_transfer')} />
                  <I size={18} /> {label as string}
                </label>
              );
            })}
          </div>
          {method === 'card' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Kart Üzerindeki İsim" name="holderName" autoComplete="cc-name" />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Kart Numarası" name="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" pattern="[0-9 ]{15,23}" />
                </div>
                <Field label="Son Kullanma (AA/YY)" name="expiry" autoComplete="cc-exp" placeholder="12/29" pattern="(0[1-9]|1[0-2])/[0-9]{2}" />
                <Field label="CVV" name="cvv" inputMode="numeric" autoComplete="cc-csc" placeholder="123" pattern="[0-9]{3,4}" />
              </div>
              <fieldset className="mt-6">
                <legend className="label-eyebrow mb-3">Taksit Seçenekleri</legend>
                <table className="w-full text-[14px]">
                  <tbody>
                    {installmentOptions.map((n) => {
                      const disabled = n > cart.maxInstallment;
                      return (
                        <tr key={n} className={`border-b border-line ${disabled ? 'text-muted/60' : ''}`}>
                          <td className="py-3">
                            <label className="flex items-center gap-3">
                              <input type="radio" name="installment" disabled={disabled} checked={installment === n} onChange={() => setInstallment(n)} className="size-4 accent-[#ffc94d]" />
                              {n === 1 ? 'Tek Çekim' : `${n} Taksit`}
                              {disabled && <span className="text-[12px]">({n === 3 ? '10.000' : '15.000'} TL üzeri)</span>}
                            </label>
                          </td>
                          <td className="py-3 text-right">{n === 1 ? '' : `${n} × ${formatPrice(Math.round((cart.total / n) * 100) / 100)}`}</td>
                          <td className="py-3 text-right font-bold">{formatPrice(cart.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </fieldset>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
                <Lock size={12} /> Demo ortamı: kart bilgileri saklanmaz, ödeme simüle edilir.
              </p>
            </>
          ) : (
            <p className="rounded-lg bg-cream p-4 text-[14px]">Siparişiniz oluşturulduktan sonra IBAN bilgileri gösterilecektir. Ödemeniz onaylandığında siparişiniz hazırlanır.</p>
          )}
          <label className="mt-5 block">
            <span className="mb-1 block text-[13px] font-semibold">Sipariş Notu (opsiyonel)</span>
            <input name="note" maxLength={500} className="input" />
          </label>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-xl border border-line bg-white p-6 shadow-card lg:sticky lg:top-40">
        <h2 className="text-lg font-bold">Sipariş Özeti</h2>
        <ul className="max-h-64 divide-y divide-line overflow-y-auto">
          {cart.items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3 text-[13px]">
              <span className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded bg-cream">
                {i.imageUrl && <Image src={i.imageUrl} alt="" fill unoptimized sizes="48px" className="object-cover" />}
              </span>
              <span className="flex-1">
                <span className="line-clamp-2 font-semibold">{i.name}</span>
                <span className="text-muted">
                  {i.sizeLabel} · {i.quantity} adet
                </span>
              </span>
              <span className="font-bold">{formatPrice(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <CartSummary cart={cart} />
        <label className="flex items-start gap-2 text-[13px]">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 size-4 accent-charcoal" />
          <span>
            <Link href="/yakinda" className="underline">
              Mesafeli Satış Sözleşmesi
            </Link>
            &apos;ni ve ön bilgilendirme formunu okudum, onaylıyorum.
          </span>
        </label>
        {error && (
          <p role="alert" className="text-[13px] font-semibold text-brand-red">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? 'İşleniyor…' : 'Ödemeyi Tamamla'}
        </button>
      </aside>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Sepetim', href: '/sepet' }, { label: 'Ödeme' }]} />
      <div className="container-page pb-16">
        <h1 className="mb-4 font-serif text-[34px] font-semibold">Ödeme</h1>
        <Steps current={1} />
        <RequireAuth>
          <Checkout />
        </RequireAuth>
      </div>
    </>
  );
}
