import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST as mutate } from '../src/app/api/workspace/route';
import { POST as ai } from '../src/app/api/ai/route';
test('API routes fail closed without config or bearer token', async () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.equal(
      (await GET(new Request('http://localhost/api/workspace/?id=unknown'))).status,
      503,
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key';
    assert.equal(
      (await GET(new Request('http://localhost/api/workspace/?id=unknown'))).status,
      401,
    );
    assert.equal(
      (await mutate(new Request('http://localhost/api/workspace/', { method: 'POST', body: '{}' })))
        .status,
      401,
    );
    assert.equal(
      (await ai(new Request('http://localhost/api/ai/', { method: 'POST', body: '{}' }))).status,
      401,
    );
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  }
});
