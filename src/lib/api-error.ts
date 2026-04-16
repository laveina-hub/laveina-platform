/** Error thrown when an API request returns 401. Used by the global QueryClient retry logic. */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Parses a non-ok API response and throws an appropriate error.
 * Throws `UnauthorizedError` for 401 responses so the global retry handler can skip retries.
 */
export async function throwApiError(response: Response, fallbackMessage: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  const message =
    (typeof body.error === "object" ? body.error?.message : body.error) ?? fallbackMessage;

  if (response.status === 401) {
    throw new UnauthorizedError(message);
  }

  throw new Error(message);
}
