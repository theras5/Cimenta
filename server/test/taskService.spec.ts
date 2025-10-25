import { expect } from 'chai';
import path from 'path';

describe('taskService.updateTaskByIdService', () => {
  it('Given un Task parcial con campos vacíos, When updateTaskByIdService, Then filtra y retorna data', async () => {
    const captured: { table?: string; payload?: any; where?: any } = {};
    const fakeSupabase = {
      from: (table: string) => ({
        update: (payload: any) => {
          captured.table = table;
          captured.payload = payload;
          return {
            eq: (col: string, val: string) => {
              captured.where = { [col]: val };
              return {
                select: () => ({
                  single: async () => ({ data: { id: 't1', ...payload }, error: null })
                })
              };
            }
          };
        }
      })
    };

    // Given: entorno y stub de supabase
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { updateTaskByIdService } = require('../src/services/taskService');

    // When: se actualiza la tarea
    const result = await updateTaskByIdService('task-123', {
      title: 'New',
      description: '',
      category: undefined as any,
      status: 'in_progress' as any,
      start_date: null as any,
      end_date: '2025-01-01T00:00:00',
      site_id: undefined as any,
      user_id: 'u1'
    });

    // Then: se envían solo campos no vacíos y retorna data
    expect(captured.table).to.equal('tasks');
    expect(captured.where).to.deep.equal({ id: 'task-123' });
    expect(captured.payload).to.deep.equal({
      title: 'New',
      status: 'in_progress',
      end_date: '2025-01-01T00:00:00',
      user_id: 'u1'
    });
    expect(result).to.have.property('id', 't1');
  });

  it('Given supabase no devuelve data, When updateTaskByIdService, Then lanza AppError 404', async () => {
    const fakeSupabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null })
            })
          })
        })
      })
    };

    // Given: entorno y stub de supabase
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { updateTaskByIdService } = require('../src/services/taskService');

    // When: se intenta actualizar
    try {
      await updateTaskByIdService('task-404', { title: 'x' } as any);
      expect.fail('Debe lanzar error');
    } catch (e: any) {
      // Then: error 404
      expect(e).to.have.property('statusCode', 404);
    }
  });
});

describe('taskService.getAllTasksService', () => {
  it('Given supabase retorna data, When getAllTasksService, Then retorna lista de tareas', async () => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
    const fakeSupabase = {
      from: (table: string) => ({
        select: () => ({
          order: () => ({ data: [{ id: 't1', title: 'A' }], error: null })
        })
      })
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAllTasksService } = require('../src/services/taskService');
    // When
    const out = await getAllTasksService();
    // Then
    expect(out).to.deep.equal([{ id: 't1', title: 'A' }]);
  });

  it('Given supabase falla, When getAllTasksService, Then lanza AppError(500)', async () => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
    const fakeSupabase = {
      from: () => ({
        select: () => ({
          order: () => ({ data: null, error: { message: 'boom' } })
        })
      })
    };
    const cfgPath = path.resolve(__dirname, '../src/config/supabase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require(cfgPath);
    cfg.supabase = fakeSupabase;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAllTasksService } = require('../src/services/taskService');
    try {
      // When
      await getAllTasksService();
      expect.fail('debió lanzar AppError 500');
    } catch (e: any) {
      // Then
      expect(e).to.have.property('statusCode', 500);
    }
  });
});
