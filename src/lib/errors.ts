// Minimal, framework-agnostic error helpers.

export class AppError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.cause = cause;
  }
}

/** Reduce any thrown value to a human-readable string. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}
