import { expect } from 'chai';
import request from 'supertest';
import express from 'express';

describe('errorMiddleware', () => {
  it('Given AppError lanzado en una ruta, When pasa por errorMiddleware, Then responde status del error y JSON con message', async () => {
    // Given: app con una ruta que lanza AppError
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AppError } = require('../src/errors/AppError');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const errorMiddleware = require('../src/middlewares/errorMiddleware').default;
    const app = express();
    app.get('/boom', () => {
      throw new AppError('fallo controlado', 418);
    });
    app.use(errorMiddleware);

    // When: se invoca la ruta que lanza el error
    const res = await request(app).get('/boom').expect(418);

    // Then: cuerpo con { error: { message } }
    expect(res.body).to.have.nested.property('error.message', 'fallo controlado');
  });

  it('Given Error genérico, When pasa por errorMiddleware, Then responde 500 con mensaje genérico', async () => {
    // Given
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const errorMiddleware = require('../src/middlewares/errorMiddleware').default;
    const app = express();
    app.get('/oops', () => {
      throw new Error('stacktrace');
    });
    app.use(errorMiddleware);

    // When
    const res = await request(app).get('/oops').expect(500);

    // Then
    expect(res.body).to.deep.equal({ error: { message: 'Error interno del servidor' } });
  });
});

