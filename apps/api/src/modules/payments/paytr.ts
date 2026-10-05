import { createHmac, timingSafeEqual } from 'node:crypto';

import axios from 'axios';

import type { AppConfig } from '@/config/Config';
import { getLogger } from '@/infra/logger';
import { AppError } from '@/utils/AppError';

type PaytrConfig = AppConfig['payment']['paytr'];

/** TL tutarını PayTR'nin beklediği kuruş tamsayısına çevirir (12,34 → 1234). */
export const toKurus = (amount: number): number => Math.round(amount * 100);

const hmacBase64 = (data: string, key: string) => createHmac('sha256', key).update(data).digest('base64');

export interface BasketLine {
  name: string;
  unitPrice: number;
  quantity: number;
}

/** PayTR user_basket: base64(JSON [[ad, "birim fiyat", adet], ...]) */
export function buildBasket(lines: BasketLine[]): string {
  const rows = lines.map((l) => [l.name, l.unitPrice.toFixed(2), l.quantity]);
  return Buffer.from(JSON.stringify(rows)).toString('base64');
}

export interface TokenHashInput {
  merchantId: string;
  userIp: string;
  merchantOid: string;
  email: string;
  paymentAmount: number;
  userBasket: string;
  noInstallment: 0 | 1;
  maxInstallment: number;
  currency: string;
  testMode: 0 | 1;
}

export function tokenHash(i: TokenHashInput, merchantKey: string, merchantSalt: string): string {
  const data =
    i.merchantId + i.userIp + i.merchantOid + i.email + i.paymentAmount + i.userBasket +
    i.noInstallment + i.maxInstallment + i.currency + i.testMode;
  return hmacBase64(data + merchantSalt, merchantKey);
}

export function callbackHash(merchantOid: string, status: string, totalAmount: string, merchantKey: string, merchantSalt: string): string {
  return hmacBase64(merchantOid + merchantSalt + status + totalAmount, merchantKey);
}

/** Bildirim (callback) hash'ini zamanlamaya dayanıklı biçimde doğrular. */
export function verifyCallbackHash(
  body: { merchant_oid?: string; status?: string; total_amount?: string; hash?: string },
  merchantKey: string,
  merchantSalt: string,
): boolean {
  if (!body.merchant_oid || !body.status || body.total_amount === undefined || !body.hash) return false;
  const expected = Buffer.from(callbackHash(body.merchant_oid, body.status, body.total_amount, merchantKey, merchantSalt));
  const given = Buffer.from(body.hash);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export interface IframeTokenRequest {
  userIp: string;
  merchantOid: string;
  email: string;
  amount: number;
  basket: BasketLine[];
  maxInstallment: number;
  userName: string;
  userAddress: string;
  userPhone: string;
  okUrl: string;
  failUrl: string;
}

/** PayTR iFrame API'den ödeme token'ı alır ve iframe URL'ini döner. */
export async function requestIframeToken(cfg: PaytrConfig, req: IframeTokenRequest): Promise<{ token: string; iframeUrl: string }> {
  const noInstallment: 0 | 1 = req.maxInstallment <= 1 ? 1 : 0;
  const hashInput: TokenHashInput = {
    merchantId: cfg.merchantId,
    userIp: req.userIp,
    merchantOid: req.merchantOid,
    email: req.email,
    paymentAmount: toKurus(req.amount),
    userBasket: buildBasket(req.basket),
    noInstallment,
    maxInstallment: noInstallment ? 0 : req.maxInstallment,
    currency: 'TL',
    testMode: cfg.testMode ? 1 : 0,
  };

  const form = new URLSearchParams({
    merchant_id: hashInput.merchantId,
    user_ip: hashInput.userIp,
    merchant_oid: hashInput.merchantOid,
    email: hashInput.email,
    payment_amount: String(hashInput.paymentAmount),
    paytr_token: tokenHash(hashInput, cfg.merchantKey, cfg.merchantSalt),
    user_basket: hashInput.userBasket,
    debug_on: cfg.debug ? '1' : '0',
    no_installment: String(hashInput.noInstallment),
    max_installment: String(hashInput.maxInstallment),
    user_name: req.userName,
    user_address: req.userAddress,
    user_phone: req.userPhone,
    merchant_ok_url: req.okUrl,
    merchant_fail_url: req.failUrl,
    timeout_limit: String(cfg.timeoutLimitMinutes),
    currency: hashInput.currency,
    test_mode: String(hashInput.testMode),
    lang: 'tr',
  });

  let data: { status?: string; token?: string; reason?: string };
  try {
    const res = await axios.post(cfg.apiUrl, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20_000,
    });
    data = res.data;
  } catch (err) {
    getLogger('paytr').error(`PayTR token isteği başarısız: ${(err as Error).message}`);
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Ödeme sağlayıcısına ulaşılamadı. Lütfen tekrar deneyin.');
  }
  if (data?.status !== 'success' || !data.token) {
    getLogger('paytr').error(`PayTR token reddedildi: ${data?.reason ?? JSON.stringify(data)}`);
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Ödeme başlatılamadı. Lütfen tekrar deneyin.');
  }
  return { token: data.token, iframeUrl: `${cfg.iframeBaseUrl}${data.token}` };
}
