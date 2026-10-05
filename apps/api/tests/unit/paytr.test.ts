import { createHmac } from 'node:crypto';

import { normalizeIp } from '@/modules/payments/payments.service';
import { buildBasket, callbackHash, tokenHash, toKurus, verifyCallbackHash } from '@/modules/payments/paytr';

const KEY = 'test-merchant-key';
const SALT = 'test-merchant-salt';
const hmac = (s: string) => createHmac('sha256', KEY).update(s).digest('base64');

describe('PayTR yardımcıları', () => {
  it('toKurus kuruş tamsayısı üretir', () => {
    expect(toKurus(1259.9)).toBe(125990);
    expect(toKurus(0.1 + 0.2)).toBe(30);
    expect(toKurus(15000)).toBe(1500000);
  });

  it('sepeti base64 JSON olarak kodlar', () => {
    const basket = buildBasket([{ name: 'Halı (160x230)', unitPrice: 4479.9, quantity: 2 }]);
    expect(JSON.parse(Buffer.from(basket, 'base64').toString())).toEqual([['Halı (160x230)', '4479.90', 2]]);
  });

  it('token hash PayTR formülüyle aynıdır', () => {
    const input = {
      merchantId: '123456',
      userIp: '85.34.78.112',
      merchantOid: 'HE261006123456P1',
      email: 'musteri@example.com',
      paymentAmount: 447990,
      userBasket: 'W1siSGFsxLEiLCI0NDc5LjkwIiwxXV0=',
      noInstallment: 0 as const,
      maxInstallment: 3,
      currency: 'TL',
      testMode: 1 as const,
    };
    const expected = hmac('123456' + '85.34.78.112' + 'HE261006123456P1' + 'musteri@example.com' + '447990' + input.userBasket + '0' + '3' + 'TL' + '1' + SALT);
    expect(tokenHash(input, KEY, SALT)).toBe(expected);
  });

  it('callback hash doğrulaması', () => {
    const hash = hmac('HE1P1' + SALT + 'success' + '447990');
    expect(callbackHash('HE1P1', 'success', '447990', KEY, SALT)).toBe(hash);
    expect(verifyCallbackHash({ merchant_oid: 'HE1P1', status: 'success', total_amount: '447990', hash }, KEY, SALT)).toBe(true);
    expect(verifyCallbackHash({ merchant_oid: 'HE1P1', status: 'success', total_amount: '1', hash }, KEY, SALT)).toBe(false);
    expect(verifyCallbackHash({ merchant_oid: 'HE1P1', status: 'failed', total_amount: '447990', hash }, KEY, SALT)).toBe(false);
    expect(verifyCallbackHash({ merchant_oid: 'HE1P1', status: 'success', total_amount: '447990', hash: 'kisa' }, KEY, SALT)).toBe(false);
    expect(verifyCallbackHash({ merchant_oid: 'HE1P1', status: 'success', total_amount: '447990' }, KEY, SALT)).toBe(false);
  });

  it('IPv6-mapped adresleri sadeleştirir', () => {
    expect(normalizeIp('::ffff:85.34.78.112')).toBe('85.34.78.112');
    expect(normalizeIp('::1')).toBe('127.0.0.1');
    expect(normalizeIp(undefined)).toBe('127.0.0.1');
  });
});
