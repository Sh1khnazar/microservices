import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

interface RpcErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const raw = exception.getError();
    const body: RpcErrorBody =
      typeof raw === 'object' && raw !== null
        ? (raw as RpcErrorBody)
        : { message: String(raw) };

    const statusCode = this.resolveStatus(body.statusCode);
    const message = body.message ?? 'Xato yuz berdi';

    this.logger.error(`RpcException [${statusCode}]: ${JSON.stringify(message)}`);

    response.status(statusCode).json({
      statusCode,
      message,
      ...(body.error ? { error: body.error } : {}),
      timestamp: new Date().toISOString(),
    });
  }

  private resolveStatus(code?: number): number {
    if (!code) return HttpStatus.INTERNAL_SERVER_ERROR;
    // Faqat ma'lum HTTP status kodlarini qabul qil
    const allowed = [400, 401, 403, 404, 409, 422, 500];
    return allowed.includes(code) ? code : HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
