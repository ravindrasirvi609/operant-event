import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function buildHost(headers: Record<string, string> = {}) {
  const response = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const request = { headers };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  it('maps a NotFoundException to a 404 with its message in the envelope', () => {
    const { host, response } = buildHost();

    filter.catch(new NotFoundException('Conference not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Conference not found' }),
      }),
    );
  });

  it('joins a class-validator array message into a single string', () => {
    const { host, response } = buildHost();

    filter.catch(
      new BadRequestException([
        'name must not be empty',
        'email must be an email',
      ]),
      host,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'name must not be empty, email must be an email',
        }),
      }),
    );
  });

  it('never leaks a raw Error message or stack for a non-HTTP exception', () => {
    const { host, response } = buildHost();

    filter.catch(new Error('database connection string leaked here'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    const [[body]] = response.json.mock.calls;
    expect(JSON.stringify(body)).not.toContain(
      'database connection string leaked here',
    );
    expect(body.error.message).toBe('An unexpected error occurred.');
  });

  it('reuses an incoming X-Correlation-Id header instead of generating a new one', () => {
    const { host, response } = buildHost({ 'x-correlation-id': 'req-123' });

    filter.catch(new NotFoundException('nope'), host);

    expect(response.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      'req-123',
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ correlationId: 'req-123' }),
      }),
    );
  });

  it('generates a correlation id when none was supplied', () => {
    const { host, response } = buildHost();

    filter.catch(new NotFoundException('nope'), host);

    const [[body]] = response.json.mock.calls;
    expect(typeof body.error.correlationId).toBe('string');
    expect(body.error.correlationId.length).toBeGreaterThan(0);
  });
});
