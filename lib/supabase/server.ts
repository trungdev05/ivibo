/**
 * Supabase server (RSC / Route Handler) client stub.
 * Mirrors @supabase/ssr's createServerClient pattern.
 * Callers guard with isSupabaseConfigured() before actually using the client.
 */

type AnyFn = (...args: unknown[]) => unknown;

function noopClient() {
  const stub: Record<string, AnyFn> = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return undefined;
        return (..._args: unknown[]) => stub;
      },
    }
  ) as unknown as Record<string, AnyFn>;
  return stub;
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const configured =
    url.includes('supabase.co') && !url.includes('your-project') && key !== 'your-anon-key';

  if (!configured) {
    return noopClient() as ReturnType<typeof import('@supabase/supabase-js').createClient>;
  }

  // Lazily require @supabase/ssr only when a real project is configured
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createServerClient } = require('@supabase/ssr');
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options: object }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore — called from a Server Component where cookies can't be set
        }
      },
    },
  }) as ReturnType<typeof import('@supabase/supabase-js').createClient>;
}
