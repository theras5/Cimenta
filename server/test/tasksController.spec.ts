import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import path from 'path';

describe('tasksController', () => {
  function makeApp() {
    const app = express();
    app.use(express.json());
    // Montar rutas reales después de stubear supabase
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require('../src/routes/tasks').default;
    app.use('/tasks', router);
    // Agregar manejador de errores real para respetar AppError (404/500)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const errorMiddleware = require('../src/middlewares/errorMiddleware').default;
    app.use(errorMiddleware);
    return app;
  }

  beforeEach(() => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  });

  it('Given tareas en supabase, When GET /tasks, Then 200 y array', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'tasks') throw new Error('Tabla inesperada: ' + table);
        return {
          select: () => ({
            order: () => ({ data: [{ id: 't1', title: 'A' }], error: null })
          })
        } as any;
      }
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;

    const app = makeApp();
    const res = await request(app).get('/tasks').expect(200);
    expect(res.body).to.be.an('array');
    expect(res.body[0]).to.have.property('id', 't1');
  });

  it('Given tareas por sitio, When GET /tasks/site/:siteId, Then 200 con tareas del sitio', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'tasks') throw new Error('Tabla inesperada: ' + table);
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              order: () => ({ data: [{ id: 't9', site_id: val }], error: null })
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
    const res = await request(app).get('/tasks/site/SITE-1').expect(200);
    expect(res.body).to.deep.equal([{ id: 't9', site_id: 'SITE-1' }]);
  });

  it('Given payload válido, When PUT /tasks/:id, Then 200 con tarea actualizada', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'tasks') throw new Error('Tabla inesperada: ' + table);
        return {
          update: (payload: any) => ({
            eq: (_col: string, _val: string) => ({
              select: () => ({
                single: async () => ({ data: { id: 't1', ...payload }, error: null })
              })
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
    const res = await request(app).put('/tasks/t1').send({ status: 'completed' }).expect(200);
    expect(res.body).to.deep.include({ id: 't1', status: 'completed' });
  });

  it('Given update sin data, When PUT /tasks/:id, Then 404', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'tasks') throw new Error('Tabla inesperada: ' + table);
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: null, error: null })
              })
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
    const res = await request(app).put('/tasks/does-not-exist').send({ title: 'x' }).expect(404);
    expect(res.body).to.have.nested.property('error.message');
  });

  it('Given tarea existente, When GET /tasks/:id, Then 200 con data', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'tasks') throw new Error('Tabla inesperada: ' + table);
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 't42', title: 'X' }, error: null })
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
    const res = await request(app).get('/tasks/t42').expect(200);
    expect(res.body).to.deep.include({ id: 't42', title: 'X' });
  });

  it('Given error de Supabase, When GET /tasks/:id, Then 500', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'tasks') throw new Error('Tabla inesperada: ' + table);
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
    await request(app).get('/tasks/t99').expect(500);
  });
});
