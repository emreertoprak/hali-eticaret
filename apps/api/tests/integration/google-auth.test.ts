import './google.env';

import { getDb } from '@/infra/db';

import { api, registerUser, teardown } from '../helpers';

const mockVerify = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerify })),
}));

afterAll(teardown);
beforeEach(() => mockVerify.mockReset());

const CREDENTIAL = 'google-id-token-'.padEnd(40, 'x');
const googleReturns = (payload: Record<string, unknown>) => mockVerify.mockResolvedValueOnce({ getPayload: () => payload });
const uniqueSub = () => String(Date.now()) + Math.round(Math.random() * 1e6);

describe('Google ile giriş', () => {
  it('sağlayıcı listesi Google client ID döner', async () => {
    const res = await api().get('/api/v1/auth/providers').expect(200);
    expect(res.body).toEqual({ password: true, google: { enabled: true, clientId: 'test-client-id.apps.googleusercontent.com' } });
  });

  it('yeni kullanıcıyı oluşturur; token bizim client ID ile doğrulanır', async () => {
    const sub = uniqueSub();
    const email = `g-${sub}@gmail.com`;
    googleReturns({ sub, email, email_verified: true, given_name: 'Zeynep', family_name: 'Kaya', picture: 'https://lh3.googleusercontent.com/a/x' });
    const res = await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(200);
    expect(mockVerify).toHaveBeenCalledWith({ idToken: CREDENTIAL, audience: 'test-client-id.apps.googleusercontent.com' });
    expect(res.body.user).toMatchObject({ email, firstName: 'Zeynep', lastName: 'Kaya', hasPassword: false, googleLinked: true });
    expect((res.headers['set-cookie'] as unknown as string[]).some((c) => c.startsWith('he_rt='))).toBe(true);

    // ikinci giriş aynı kullanıcıyı bulur
    googleReturns({ sub, email, email_verified: true, given_name: 'Zeynep', family_name: 'Kaya' });
    const again = await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(200);
    expect(again.body.user.id).toBe(res.body.user.id);

    // şifresi olmayan Google hesabına şifreyle girilemez
    await api().post('/api/v1/auth/login').send({ email, password: 'Herhangi123' }).expect(401);
  });

  it('doğrulanmamış site hesabına bağlanırken eski şifre ve oturumlar sıfırlanır', async () => {
    const token = await registerUser(); // sitede e-posta doğrulaması yapılmamış hesap
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    const login = await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(200);
    const oldCookie = (login.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('he_rt='))!.split(';')[0];

    googleReturns({ sub: uniqueSub(), email: me.body.email, email_verified: true, name: 'Gerçek Sahip' });
    const res = await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(200);
    expect(res.body.user).toMatchObject({ id: me.body.id, hasPassword: false, googleLinked: true });
    await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(401);
    await api().post('/api/v1/auth/refresh').set('Cookie', oldCookie).expect(401);
  });

  it('doğrulanmış hesaba bağlanırken şifre korunur', async () => {
    const token = await registerUser();
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    await getDb()('users').where({ id: me.body.id }).update({ email_verified_at: new Date() });
    googleReturns({ sub: uniqueSub(), email: me.body.email, email_verified: true, name: 'Test Kullanıcı' });
    const res = await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(200);
    expect(res.body.user).toMatchObject({ hasPassword: true, googleLinked: true });
    await api().post('/api/v1/auth/login').send({ email: me.body.email, password: 'Sifre1234' }).expect(200);
  });

  it('e-postası doğrulanmamış Google hesabı ve geçersiz token reddedilir', async () => {
    googleReturns({ sub: uniqueSub(), email: 'dogrulanmamis@gmail.com', email_verified: false });
    const unverified = await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(401);
    expect(unverified.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    mockVerify.mockRejectedValueOnce(new Error('Wrong recipient, payload audience != requiredAudience'));
    const invalid = await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(401);
    expect(invalid.body.error.code).toBe('INVALID_GOOGLE_TOKEN');

    await api().post('/api/v1/auth/google').send({ credential: 'kisa' }).expect(400);
  });

  it('başka bir Google hesabına bağlı e-posta ile çakışma 409', async () => {
    const sub = uniqueSub();
    const email = `cakisma-${sub}@gmail.com`;
    googleReturns({ sub, email, email_verified: true, name: 'A B' });
    await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(200);
    googleReturns({ sub: `${sub}9`, email, email_verified: true, name: 'A B' });
    await api().post('/api/v1/auth/google').send({ credential: CREDENTIAL }).expect(409);
  });
});
