// payments-paytr.test.ts tarafından ilk import olarak yüklenir: config okunmadan önce PayTR modunu açar.
process.env.PAYMENT_PROVIDER = 'paytr';
process.env.PAYTR_MERCHANT_ID = '999999';
process.env.PAYTR_MERCHANT_KEY = 'test-merchant-key';
process.env.PAYTR_MERCHANT_SALT = 'test-merchant-salt';
