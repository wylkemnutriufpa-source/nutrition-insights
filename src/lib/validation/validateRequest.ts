/**
 * 🛡️ DEFENSE IN DEPTH - Middleware de Validação
 * 
 * Função genérica para validar dados contra schemas Zod.
 * Garante que NENHUM dado inválido entre no sistema.
 */

import { z } from 'zod';
import { logError } from '@/lib/monitoring';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details: z.ZodIssue[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Valida dados contra um schema Zod
 * @param schema - Schema Zod para validação
 * @param data - Dados a validar
 * @param context - Contexto para logging (ex: "CreateMealPlan")
 * @returns Dados validados e tipados
 * @throws ValidationError se dados forem inválidos
 */
export async function validateRequest<T>(
  schema: z.Schema<T>,
  data: unknown,
  context: string = 'Request'
): Promise<T> {
  try {
    const validated = await schema.parseAsync(data);
    console.log(`[VALIDATION] ✓ ${context} passed validation`);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = `[VALIDATION] ✗ ${context} failed: ${error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ')}`;
      
      console.error(message);
      logError("data_error", context, message, { errors: error.issues });
      
      throw new ValidationError(
        `${context} validation failed`,
        error.issues
      );
    }
    throw error;
  }
}

/**
 * Valida dados de forma síncrona (para casos onde async não é possível)
 */
export function validateRequestSync<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string = 'Request'
): T {
  try {
    const validated = schema.parse(data);
    console.log(`[VALIDATION] ✓ ${context} passed validation`);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = `[VALIDATION] ✗ ${context} failed: ${error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ')}`;
      
      console.error(message);
      logError("data_error", context, message, { errors: error.issues });
      
      throw new ValidationError(
        `${context} validation failed`,
        error.issues
      );
    }
    throw error;
  }
}

/**
 * Cria um validador tipado para um schema específico
 * Útil para reutilizar validação em múltiplos lugares
 */
export function createValidator<T>(
  schema: z.Schema<T>,
  defaultContext: string
) {
  return {
    async validate(data: unknown, context?: string): Promise<T> {
      return validateRequest(schema, data, context || defaultContext);
    },
    validateSync(data: unknown, context?: string): T {
      return validateRequestSync(schema, data, context || defaultContext);
    },
  };
}
