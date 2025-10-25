import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import path from 'path';

describe('authControllers', () => {
  function makeApp() {
    const app = express();
    app.use(express.json());
    // Montar router real luego de stubear supabase
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require('../src/routes/auth').default;
    app.use('/auth', router);
    return app;
  }

  beforeEach(() => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  });

  it('Given registro válido, When POST /auth/register, Then crea user y profile (201)', async () => {
    let profileInserted: any = null;
    const fakeSupabase = {
      auth: {
        signUp: async ({ email, password }: any) => ({ data: { user: { id: 'u1', email } }, error: null })
      },
      from: (table: string) => {
        if (table !== 'profiles') throw new Error('Tabla inesperada: ' + table);
        return {
          insert: (row: any) => {
            profileInserted = row;
            return { data: { id: row.id, name: row.name }, error: null };
          }
        } as any;
      }
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const body = { email: 'a@a.com', password: 'secret', name: 'Alice' };
    const res = await request(app).post('/auth/register').send(body).expect(201);
    expect(res.body).to.include({ success: true });
    expect(res.body.user).to.include({ id: 'u1', email: 'a@a.com' });
    // createProfile fue invocado con los datos correctos
    expect(profileInserted).to.deep.equal({ id: 'u1', name: 'Alice' });
  });

  it('Given error de Supabase, When POST /auth/register, Then 400 con error', async () => {
    const fakeSupabase = {
      auth: {
        signUp: async () => ({ data: null, error: { message: 'signup failed' } })
      },
      from: () => ({})
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const res = await request(app).post('/auth/register').send({ email: 'a@a.com', password: 'x', name: 'A' }).expect(400);
    expect(res.body).to.have.property('error');
  });

  it('Given faltan email/password, When POST /auth/register, Then 400 (validación de servicio)', async () => {
    const fakeSupabase = { auth: { signUp: async () => ({ data: null, error: null }) }, from: () => ({}) } as any;
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    // Falta password
    await request(app).post('/auth/register').send({ email: 'a@a.com', name: 'A' }).expect(400);
    // Falta email
    await request(app).post('/auth/register').send({ password: 'x', name: 'A' }).expect(400);
  });

  it('Given falta whatsapp_jid, When GET /auth/profile, Then 400', async () => {
    const fakeSupabase = { from: () => ({}) } as any;
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const res = await request(app).get('/auth/profile').expect(400);
    expect(res.body).to.have.property('message');
  });

  it('Given whatsapp_jid válido, When GET /auth/profile, Then 200 con perfil', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'profiles') throw new Error('Tabla inesperada: ' + table);
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              single: async () => ({ data: { id: 'u1', whatsapp_jid: '123@wa' }, error: null })
            })
          })
        } as any;
      }
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const res = await request(app).get('/auth/profile').query({ whatsapp_jid: '123@wa' }).expect(200);
    expect(res.body).to.deep.equal({ id: 'u1', whatsapp_jid: '123@wa' });
  });
});
