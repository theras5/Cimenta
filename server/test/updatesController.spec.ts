import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import path from 'path';

describe('updatesController (GET /updates)', () => {
  it('Given updates en supabase, When GET /updates, Then 200 y array', async () => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
    const fakeSupabase = {
      from: (table: string) => {
        if (table !== 'updates') throw new Error('Tabla inesperada: ' + table);
        return {
          select: () => ({
            order: () => ({
              // soporte for eq("site_id", value)
              eq: () => Promise.resolve({ data: [{ id: 'u1', title: 'T' }], error: null }),
              // soporte para await query sin eq
              then: (resolve: any) => resolve({ data: [{ id: 'u1', title: 'T' }], error: null })
            })
          })
        } as any;
      }
    };

    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getUpdates } = require('../src/controllers/updatesController');

    const app = express();
    app.use(express.json());
    app.get('/updates', getUpdates);

    // When
    const res = await request(app).get('/updates').expect(200);
    // Then
    expect(res.body).to.be.an('array');
    expect(res.body[0]).to.have.property('id', 'u1');
  });
});
