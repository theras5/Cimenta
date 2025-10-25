import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import path from 'path';

describe('purchasesController', () => {
  function makeApp() {
    const app = express();
    app.use(express.json());
    // Montar rutas reales después de stubear supabase
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require('../src/routes/purchases').default;
    app.use('/purchases', router);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const errorMiddleware = require('../src/middlewares/errorMiddleware').default;
    app.use(errorMiddleware);
    return app;
  }

  beforeEach(() => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  });

  it('Given body sin product/category, When POST /purchases, Then 400 con error', async () => {
    // Stub mínimo para permitir cargar servicios aunque no se use
    const fakeSupabase = { from: () => ({}) } as any;
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    // Falta product y category
    const res = await request(app).post('/purchases').send({}).expect(400);
    expect(res.body).to.have.property('error');
  });

  it('Given body válido, When POST /purchases, Then 201 con data creada', async () => {
    const fakeSupabase = {
      from: (table: string) => ({
        insert: (rows: any[]) => ({
          select: () => ({
            single: async () => ({ data: { id: 'p1', ...rows[0] }, error: null })
          })
        })
      })
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const body = { product: 'Cemento', category: 'material', quantity: 5, user_id: 'u1', site_id: 's1' };
    const res = await request(app).post('/purchases').send(body).expect(201);
    expect(res.body).to.include({ id: 'p1', product: 'Cemento', category: 'material', quantity: 5, user_id: 'u1', site_id: 's1' });
  });

  it('Given payload parcial, When PUT /purchases/:id, Then 200 con compra actualizada', async () => {
    const fakeSupabase = {
      from: (table: string) => ({
        update: (payload: any) => ({
          eq: (_col: string, _val: string) => ({
            select: () => ({
              single: async () => ({ data: { id: 'p1', ...payload }, error: null })
            })
          })
        })
      })
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const res = await request(app).put('/purchases/p1').send({ status: 'pending' }).expect(200);
    expect(res.body).to.deep.include({ id: 'p1', status: 'pending' });
  });

  it('Given id válido, When DELETE /purchases/:id, Then 204', async () => {
    const fakeSupabase = {
      from: () => ({
        delete: () => ({ eq: () => ({ error: null }) })
      })
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    await request(app).delete('/purchases/p1').expect(204);
  });

  it('Given body sin status, When PATCH /purchases/:id/status, Then 400', async () => {
    const fakeSupabase = { from: () => ({}) } as any;
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const res = await request(app).patch('/purchases/p1/status').send({}).expect(400);
    expect(res.body).to.have.property('error');
  });

  it('Given compra existente, When GET /purchases/:id, Then 200 con data', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'purchases') throw new Error('Tabla inesperada: ' + table);
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              single: async () => ({ data: { id: 'p1', product: 'Clavos' }, error: null })
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
    const res = await request(app).get('/purchases/p1').expect(200);
    expect(res.body).to.deep.include({ id: 'p1', product: 'Clavos' });
  });

  it('Given error en Supabase, When GET /purchases/:id, Then 500 con error', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'purchases') throw new Error('Tabla inesperada: ' + table);
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { message: 'boom' } })
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
    const res = await request(app).get('/purchases/pX').expect(500);
    expect(res.body).to.have.nested.property('error.message', 'boom');
  });
});
