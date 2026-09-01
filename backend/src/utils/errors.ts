import { Context } from 'hono';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}

export class AppError extends Error {
  public status: number;
  public code: string;
  public details?: Record<string, any>;

  constructor(message: string, status: number = 400, code: string = 'BAD_REQUEST', details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function formatProblemDetails(
  c: Context,
  error: {
    message: string;
    status?: number;
    code?: string;
    details?: Record<string, any>;
    type?: string;
  }
): ProblemDetails {
  const status = error.status || 500;
  const code = error.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const type = error.type || `https://api.wms-simple.internal/errors/${code.toLowerCase()}`;

  return {
    type,
    title: code.replace(/_/g, ' '),
    status,
    detail: error.message,
    instance: c.req.path,
    code,
    details: error.details,
    timestamp: new Date().toISOString()
  };
}
