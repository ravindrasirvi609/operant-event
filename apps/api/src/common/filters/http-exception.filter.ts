import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

interface ErrorEnvelope {
  error: { code: string; message: string; correlationId: string };
}

/**
 * Every error response — expected (HttpException) or not — comes back as
 * { error: { code, message, correlationId } }. Unexpected errors never
 * reach the client with their real message/stack (SRS §31); they're
 * logged server-side against the same correlationId instead.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = this.resolveCorrelationId(request);
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isHttpException) {
      const error = exception as Error;
      this.logger.error(
        `[${correlationId}] ${error?.message ?? String(exception)}`,
        error?.stack,
      );
    }

    const body: ErrorEnvelope = {
      error: {
        ...this.resolveCodeAndMessage(exception, isHttpException, status),
        correlationId,
      },
    };

    response.setHeader('x-correlation-id', correlationId);
    response.status(status).json(body);
  }

  private resolveCorrelationId(request: Request): string {
    const incoming = request.headers['x-correlation-id'];
    return typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomUUID();
  }

  private resolveCodeAndMessage(
    exception: unknown,
    isHttpException: boolean,
    status: number,
  ): { code: string; message: string } {
    if (!isHttpException) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      };
    }

    const httpException = exception as HttpException;
    const response = httpException.getResponse();

    if (typeof response === 'string') {
      return { code: HttpStatus[status] ?? 'ERROR', message: response };
    }

    const body = response as Record<string, unknown>;
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : ((body.message as string) ?? httpException.message);
    return {
      code: (body.error as string) ?? HttpStatus[status] ?? 'ERROR',
      message,
    };
  }
}
