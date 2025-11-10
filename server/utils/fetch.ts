/**
 * Unified fetch wrapper that relies on the built-in global fetch (Node 18+).
 * Centralizing access makes it easy to extend with fallbacks if we ever
 * need to support older runtimes without native fetch.
 */

type FetchFn = typeof fetch;

/**
 * Retrieve a fetch implementation. The result is cached to avoid
 * repeated feature detection.
 */
export const getFetch = async (): Promise<FetchFn> => {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error(
      'Fetch API is not available in the current runtime. Please upgrade to Node 18+ or provide a polyfill.'
    );
  }
  return globalThis.fetch.bind(globalThis);
};

/**
 * Convenience helper for environments where top-level await is unavailable.
 * Returns a function that proxies to the resolved fetch implementation.
 */
export const fetchWithFallback: FetchFn = ((...args: Parameters<FetchFn>) => {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error(
      'Fetch API is not available in the current runtime. Please upgrade to Node 18+ or provide a polyfill.'
    );
  }
  return globalThis.fetch(...args);
}) as FetchFn;

