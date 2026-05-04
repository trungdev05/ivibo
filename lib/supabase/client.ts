/**
 * Supabase browser client stub.
 * Real credentials are loaded from NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * All callers guard with isSupabaseConfigured() before using the returned client, so
 * this stub is only ever invoked when the env vars point to a real Supabase project.
 */

type AnyFn = (...args: unknown[]) => unknown;

function noopClient() {
  const stub: Record<string, AnyFn> = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return undefined; // not a Promise
        return (..._args: unknown[]) => stub;
      },
    }
  ) as unknown as Record<string, AnyFn>;
  return stub;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const configured =
    url.includes('supabase.co') && !url.includes('your-project') && key !== 'your-anon-key';

  if (!configured) {
    // Return a no-op proxy — callers guard before using it
    return noopClient() as ReturnType<typeof import('@supabase/supabase-js').createClient>;
  }

  // Lazily require the real package only when actually needed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: _create } = require('@supabase/supabase-js');
  return _create(url, key) as ReturnType<typeof import('@supabase/supabase-js').createClient>;
}
