import { api, DEMO, teardown } from '../helpers';

afterAll(teardown);

describe('Üyelik', () => {
  const email = `uye-${Date.now()}@example.com`;

  it('kayıt olur ve token döner', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email, password: 'GucluSifre1', firstName: 'Ayşe', lastName: 'Yılmaz', phone: '5551234567' })
      .expect(201);
    expect(res.body.user).toMatchObject({ email, firstName: 'Ayşe', role: 'customer' });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('aynı e-posta ile tekrar kayıt 409', async () => {
    await api()
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), password: 'GucluSifre1', firstName: 'A', lastName: 'B' })
      .expect(409);
  });

  it('kısa şifre ile kayıt 400', async () => {
    await api().post('/api/v1/auth/register').send({ email: 'x@example.com', password: '123', firstName: 'A', lastName: 'B' }).expect(400);
  });

  it('hatalı şifre ile giriş 401', async () => {
    const res = await api().post('/api/v1/auth/login').send({ ...DEMO, password: 'yanlis-sifre' }).expect(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('giriş, /me ve token yenileme', async () => {
    const login = await api().post('/api/v1/auth/login').send(DEMO).expect(200);
    const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
    expect(me.body.email).toBe(DEMO.email);

    const refreshed = await api().post('/api/v1/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
  });

  it('refresh token access token yerine kullanılamaz', async () => {
    const login = await api().post('/api/v1/auth/login').send(DEMO).expect(200);
    await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.refreshToken}`).expect(401);
    await api().post('/api/v1/auth/refresh').send({ refreshToken: login.body.accessToken }).expect(401);
  });

  it('token olmadan /me 401', async () => {
    await api().get('/api/v1/auth/me').expect(401);
  });
});
