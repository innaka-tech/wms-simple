import { Context, Next } from 'hono';
import { ZodSchema, ZodError } from 'zod';
import { formatProblemDetails } from '../utils/errors.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const rawBody = await c.req.json();
      const validated = schema.parse(rawBody);
      c.set('validatedBody', validated);
      await next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message
        }));

        const problem = formatProblemDetails(c, {
          message: 'Validasi payload JSON gagal (Invalid schema structure)',
          status: 400,
          code: 'SCHEMA_VALIDATION_FAILED',
          details: { issues }
        });

        return c.json(problem, 400);
      }

      const problem = formatProblemDetails(c, {
        message: 'Payload request tidak berformat JSON valid',
        status: 400,
        code: 'INVALID_JSON'
      });
      return c.json(problem, 400);
    }
  };
}
