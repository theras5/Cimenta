import { expect } from 'chai';
import path from 'path';

describe('siteService.getSitesByUserService', () => {
  it('Given belongs_to vacío, When getSitesByUserService, Then retorna []', async () => {
    const fakeSupabase = {
      from: (table: string) => {
        if (table === 'belongs_to') {
          return {
            select: () => ({
              eq: () => ({ data: [], error: null })
            })
          } as any;
        }
        throw new Error('No debería consultar otra tabla');
      }
    };

    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSitesByUserService } = require('../src/services/siteService');

    // When
    const out = await getSitesByUserService('user-x');
    // Then
    expect(out).to.deep.equal([]);
  });

  it('Given site_ids en belongs_to, When getSitesByUserService, Then consulta site.in(ids) y retorna sitios', async () => {
    const calls: any[] = [];
    const fakeSupabase = {
      from: (table: string) => {
        if (table === 'belongs_to') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({ data: [{ site_id: 's1' }, { site_id: 's2' }], error: null })
            })
          } as any;
        }
        if (table === 'site') {
          return {
            select: () => ({
              in: (_col: string, ids: string[]) => {
                calls.push({ ids });
                return {
                  order: () => ({ data: [{ id: 's1', address: 'A' }, { id: 's2', address: 'B' }], error: null })
                } as any;
              }
            })
          } as any;
        }
        throw new Error('Tabla inesperada: ' + table);
      }
    };

    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSitesByUserService } = require('../src/services/siteService');

    // When
    const out = await getSitesByUserService('user-y');
    // Then
    expect(calls[0].ids).to.deep.equal(['s1', 's2']);
    expect(out).to.deep.equal([{ id: 's1', address: 'A' }, { id: 's2', address: 'B' }]);
  });
});
