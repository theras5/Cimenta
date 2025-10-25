import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import path from 'path';

describe('siteController.createSite', () => {
  function makeApp() {
    const app = express();
    app.use(express.json());
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require('../src/routes/sites').default;
    app.use('/sites', router);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const errorMiddleware = require('../src/middlewares/errorMiddleware').default;
    app.use(errorMiddleware);
    return app;
  }

  beforeEach(() => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  });

  it('Given faltan address/role/user_id, When POST /sites, Then 400', async () => {
    const fakeSupabase = { from: () => ({}) } as any;
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    await request(app).post('/sites').send({}).expect(400); // falta address
    await request(app).post('/sites').send({ address: 'X' }).expect(400); // falta role
    await request(app).post('/sites').send({ address: 'X', role: 'admin' }).expect(400); // falta user_id
  });

  it('Given datos válidos, When POST /sites, Then 201 y crea belongs_to', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table === 'site') {
          return {
            insert: (_rows: any[]) => ({ select: () => ({ single: async () => ({ data: { id: 's1', address: 'Av 123' }, error: null }) }) })
          } as any;
        }
        if (table === 'belongs_to') {
          return { insert: async () => ({ error: null }) } as any;
        }
        throw new Error('Tabla inesperada: ' + table);
      }
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const body = { address: 'Av 123', role: 'owner', user_id: 'u1' };
    const res = await request(app).post('/sites').send(body).expect(201);
    expect(res.body).to.deep.include({ id: 's1', address: 'Av 123' });
  });

  it('Given error al crear belongs_to, When POST /sites, Then 500', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table === 'site') {
          return {
            insert: (_rows: any[]) => ({ select: () => ({ single: async () => ({ data: { id: 's1', address: 'Av 123' }, error: null }) }) })
          } as any;
        }
        if (table === 'belongs_to') {
          return { insert: async () => ({ error: { message: 'fail belongs' } }) } as any;
        }
        throw new Error('Tabla inesperada: ' + table);
      }
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const res = await request(app).post('/sites').send({ address: 'Av 123', role: 'owner', user_id: 'u1' }).expect(500);
    expect(res.body).to.have.nested.property('error.message', 'Error interno del servidor');
  });
});
