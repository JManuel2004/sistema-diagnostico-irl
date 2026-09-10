import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { ApiError, http, isMissingHttpRoute } from '../http';

/**
 * El interceptor de errores es la pieza que permite a la UI distinguir
 * escenarios. Antes rechazaba con el mensaje genérico de axios en cuanto
 * el cuerpo era un objeto —el caso normal—, así que el `code` estable del
 * backend no llegaba nunca al componente.
 */
function rejectVia(status: number, data: unknown): Promise<unknown> {
  const handler = (
    http.interceptors.response as unknown as {
      handlers: { rejected: (e: AxiosError) => Promise<never> }[];
    }
  ).handlers[0].rejected;

  const error = new AxiosError('Request failed with status code ' + status);
  error.response = {
    status,
    statusText: '',
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return handler(error).catch((e: unknown) => e);
}

const problema = {
  type: 'https://errors.innlab.icesi.edu.co/routing_recommendation_not_generated',
  title: 'routing recommendation not generated',
  status: 409,
  detail: 'El diagnóstico X todavía no tiene recomendación de portafolio generada.',
  instance: '/api/v1/diagnosticos/X/recomendacion',
  code: 'ROUTING_RECOMMENDATION_NOT_GENERATED',
  correlationId: 'abc-123',
};

describe('interceptor de errores HTTP', () => {
  it('conserva el code estable del documento RFC 7807', async () => {
    const error = (await rejectVia(409, problema)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('ROUTING_RECOMMENDATION_NOT_GENERATED');
    expect(error.status).toBe(409);
    expect(error.correlationId).toBe('abc-123');
  });

  it('usa el detail como mensaje, no el texto genérico de axios', async () => {
    const error = (await rejectVia(409, problema)) as ApiError;
    expect(error.message).toBe(problema.detail);
  });

  it('conserva el status aunque el cuerpo no siga el contrato', async () => {
    // Un proxy o un gateway pueden devolver HTML. Sin `status` la política
    // de "no reintentar 4xx" de query-client nunca se aplicaría.
    const error = (await rejectVia(404, '<html>Not Found</html>')) as ApiError;
    expect(error.status).toBe(404);
    expect(error.code).toBeUndefined();
  });

  it('no revienta cuando no hay respuesta (fallo de red)', async () => {
    const handler = (
      http.interceptors.response as unknown as {
        handlers: { rejected: (e: AxiosError) => Promise<never> }[];
      }
    ).handlers[0].rejected;

    const error = (await handler(new AxiosError('Network Error')).catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Network Error');
    expect(error.status).toBeUndefined();
  });
});

describe('isMissingHttpRoute', () => {
  it('reconoce el 404 de Fastify cuando la ruta no está registrada', async () => {
    const error = (await rejectVia(404, {
      type: 'https://errors.innlab.icesi.edu.co/not_found',
      title: 'Cannot POST /api/v1/diagnosticos/x/finalizar-inicial',
      status: 404,
      detail: 'Cannot POST /api/v1/diagnosticos/x/finalizar-inicial',
      instance: '/api/v1/diagnosticos/x/finalizar-inicial',
      code: 'NOT_FOUND',
    })) as ApiError;

    expect(isMissingHttpRoute(error)).toBe(true);
  });

  it('no confunde un 404 de dominio con una ruta ausente', async () => {
    const error = (await rejectVia(404, {
      type: 'https://errors.innlab.icesi.edu.co/not_found',
      title: 'not found',
      status: 404,
      detail: "Diagnostico 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' not found",
      instance: '/api/v1/diagnosticos/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/finalizar-inicial',
      code: 'NOT_FOUND',
    })) as ApiError;

    expect(isMissingHttpRoute(error)).toBe(false);
  });
});
