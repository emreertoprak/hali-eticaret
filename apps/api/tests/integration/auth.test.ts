import jwt from 'jsonwebtoken';

import { LogMailer } from '@/infra/mailer';

import { api, DEMO, registerUser, teardown } from '../helpers';

afterAll(teardown);

/** Set-Cookie başlığından refresh çerezini ("he_rt=...") çıkarır. */
function refreshCookie(res: { headers: Record<string, unknown> }): string {
  const cookies = (res.headers['set-cookie'] as string[] | undefined) ?? [];
  const c = cookies.find((x) => x.startsWith('he_rt='));
  if (!c) throw new Error('refresh çerezi yok');
  return c.split(';')[0];
}

const uniqueEmail = (p: string) => `${p}-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.com`;

describe('Üyelik', () => {
  const email = uniqueEmail('uye');

  it('kayıt olur; refresh token yalnızca httpOnly çerezde döner', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email, password: 'GucluSifre1', firstName: 'Ayşe', lastName: 'Yılmaz', phone: '5551234567' })
      .expect(201);
    expect(res.body.user).toMatchObject({ email, firstName: 'Ayşe', role: 'customer', hasPassword: true, googleLinked: false });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.expiresIn).toBeGreaterThan(0);
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('he_rt='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    const hint = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('he_session='))!;
    expect(hint).toMatch(/^he_session=1;/);
    expect(hint).not.toMatch(/HttpOnly/i);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('aynı e-posta ile tekrar kayıt 409', async () => {
    await api().post('/api/v1/auth/register').send({ email: email.toUpperCase(), password: 'GucluSifre1', firstName: 'A', lastName: 'B' }).expect(409);
  });

  it.each([
    ['123', 'en az 8'],
    ['sadeceharf', 'rakam'],
    ['12345678', 'harf'],
  ])('zayıf şifre (%s) reddedilir', async (password, msg) => {
    const res = await api().post('/api/v1/auth/register').send({ email: uniqueEmail('zayif'), password, firstName: 'A', lastName: 'B' }).expect(400);
    expect(res.body.error.details.fieldErrors.password[0]).toContain(msg);
  });

  it('hatalı şifre ile giriş 401 ve hesap bilgisi sızdırmaz', async () => {
    const wrong = await api().post('/api/v1/auth/login').send({ ...DEMO, password: 'yanlis-sifre1' }).expect(401);
    const unknown = await api().post('/api/v1/auth/login').send({ email: uniqueEmail('yok'), password: 'yanlis-sifre1' }).expect(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
  });

  it('giriş ve /me', async () => {
    const login = await api().post('/api/v1/auth/login').send(DEMO).expect(200);
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
    expect(me.body.email).toBe(DEMO.email);
  });

  it('token olmadan /me 401', async () => {
    await api().get('/api/v1/auth/me').expect(401);
  });

  it('Google client ID tanımlı değilse Google girişi kapalıdır', async () => {
    const providers = await api().get('/api/v1/auth/providers').expect(200);
    expect(providers.body.google).toEqual({ enabled: false, clientId: null });
    const res = await api().post('/api/v1/auth/google').send({ credential: 'x'.repeat(40) }).expect(404);
    expect(res.body.error.code).toBe('PROVIDER_DISABLED');
  });
});

describe('Oturum yönetimi (refresh rotasyonu)', () => {
  it('refresh çerezle yeni oturum verir ve çerezi döndürür', async () => {
    const login = await api().post('/api/v1/auth/login').send(DEMO).expect(200);
    const first = refreshCookie(login);
    const refreshed = await api().post('/api/v1/auth/refresh').set('Cookie', first).expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(refreshed)).not.toBe(first);
  });

  it('kullanılmış refresh token tekrar gelirse tüm oturumlar kapatılır', async () => {
    const token = await registerUser();
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    const login = await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(200);
    const stolen = refreshCookie(login);
    const legit = await api().post('/api/v1/auth/refresh').set('Cookie', stolen).expect(200);
    const newer = refreshCookie(legit);

    await api().post('/api/v1/auth/refresh').set('Cookie', stolen).expect(401); // yeniden kullanım tespit edildi
    await api().post('/api/v1/auth/refresh').set('Cookie', newer).expect(401); // aile iptal edildi
  });

  it('çerez yoksa ve sahte token ile refresh 401', async () => {
    await api().post('/api/v1/auth/refresh').expect(401);
    await api().post('/api/v1/auth/refresh').set('Cookie', 'he_rt=sahte.token.degeri').expect(401);
  });

  it('logout refresh token\'ı iptal eder', async () => {
    const login = await api().post('/api/v1/auth/login').send(DEMO).expect(200);
    const cookie = refreshCookie(login);
    await api().post('/api/v1/auth/logout').set('Cookie', cookie).expect(204);
    await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
  });

  it('logout-all tüm cihazlardaki oturumları kapatır', async () => {
    const a = await api().post('/api/v1/auth/login').send(DEMO).expect(200);
    const b = await api().post('/api/v1/auth/login').send(DEMO).expect(200);
    await api().post('/api/v1/auth/logout-all').set('Authorization', `Bearer ${a.body.accessToken}`).expect(204);
    await api().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(a)).expect(401);
    await api().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(b)).expect(401);
  });
});

describe('Güvenlik', () => {
  it('hesap 5 hatalı denemeden sonra kilitlenir (doğru şifreyle bile)', async () => {
    const token = await registerUser();
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    for (let i = 0; i < 5; i++) {
      await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'yanlis1234' }).expect(401);
    }
    const locked = await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(429);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('başarılı giriş hatalı deneme sayacını sıfırlar', async () => {
    const token = await registerUser();
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    for (let i = 0; i < 4; i++) await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'yanlis1234' }).expect(401);
    await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(200);
    for (let i = 0; i < 4; i++) await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'yanlis1234' }).expect(401);
    await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(200);
  });

  it('yanlış audience, "none" algoritması ve refresh token access yerine kabul edilmez', async () => {
    const secret = 'dev-access-secret-change-me-0123456789';
    const wrongAud = jwt.sign({ typ: 'access', role: 'admin', email: 'x@y.z' }, secret, { subject: '1', issuer: 'hali-api', audience: 'baska', expiresIn: 60 });
    await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${wrongAud}`).expect(401);
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1","typ":"access","role":"admin","iss":"hali-api","aud":"hali-web"}').toString('base64url')}.`;
    await api().get('/api/v1/admin/products').set('Authorization', `Bearer ${none}`).expect(401);
    const login = await api().post('/api/v1/auth/login').send(DEMO).expect(200);
    const refreshJwt = refreshCookie(login).split('=')[1];
    await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${refreshJwt}`).expect(401);
  });

  it('güvenlik başlıkları ve Server-Timing döner', async () => {
    const res = await api().get('/api/v1/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['server-timing']).toMatch(/^app;dur=\d+(\.\d)?$/);
  });
});

describe('Şifre sıfırlama ve değiştirme', () => {
  it('sıfırlama e-postası gönderir, token bir kez kullanılır, eski şifre geçersizleşir', async () => {
    const token = await registerUser();
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    const before = LogMailer.outbox.length;
    await api().post('/api/v1/auth/password/forgot').send({ email: me.body.email }).expect(202);
    const mail = LogMailer.outbox[LogMailer.outbox.length - 1];
    expect(LogMailer.outbox.length).toBe(before + 1);
    expect(mail.to).toBe(me.body.email);
    const resetToken = /token=([\w-]+)/.exec(mail.text)![1];

    // dakika içinde ikinci istek e-posta göndermez (ama yanıt aynı)
    await api().post('/api/v1/auth/password/forgot').send({ email: me.body.email }).expect(202);
    expect(LogMailer.outbox.length).toBe(before + 1);

    const reset = await api().post('/api/v1/auth/password/reset').send({ token: resetToken, password: 'YeniSifre99' }).expect(200);
    expect(reset.body.accessToken).toEqual(expect.any(String));
    await api().post('/api/v1/auth/password/reset').send({ token: resetToken, password: 'BaskaSifre99' }).expect(400);
    await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(401);
    await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'YeniSifre99' }).expect(200);
  });

  it('kayıtlı olmayan e-posta için de aynı yanıt döner, e-posta gönderilmez', async () => {
    const before = LogMailer.outbox.length;
    const res = await api().post('/api/v1/auth/password/forgot').send({ email: uniqueEmail('yok') }).expect(202);
    expect(res.body.message).toContain('kayıtlı bir hesap varsa');
    expect(LogMailer.outbox.length).toBe(before);
  });

  it('geçersiz token reddedilir', async () => {
    const res = await api().post('/api/v1/auth/password/reset').send({ token: 'x'.repeat(43), password: 'YeniSifre99' }).expect(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('şifre değiştirme mevcut şifreyi ister ve diğer oturumları kapatır', async () => {
    const token = await registerUser();
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    const other = await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(200);
    await api().post('/api/v1/auth/password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'yanlis1234', newPassword: 'Degisti123' }).expect(400);
    const changed = await api().post('/api/v1/auth/password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'Sifre1234', newPassword: 'Degisti123' }).expect(200);
    expect(changed.body.accessToken).toEqual(expect.any(String));
    await api().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(other)).expect(401);
    await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Degisti123' }).expect(200);
  });
});
