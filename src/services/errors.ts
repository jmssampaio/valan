/**
 * Supabase reports a failure as a plain object. Services throw a real Error instead, so a
 * failed call rejects like any other failure and keeps its message.
 */
export function toError(failure: { message: string }): Error {
  return failure instanceof Error ? failure : new Error(failure.message, { cause: failure });
}
