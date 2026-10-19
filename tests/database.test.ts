import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('database policies, invitations, quotas and revision compare-and-swap', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
    );
    const sql = await readFile(
      new URL('../supabase/migrations/001_workspace.sql', import.meta.url),
      'utf8',
    );
    await db.exec(sql.replace(/^alter publication .*;$/gm, ''));
    const a = '00000000-0000-4000-8000-000000000001',
      b = '00000000-0000-4000-8000-000000000002';
    await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)', [
      a,
      'a@test.example',
      b,
      'b@test.example',
    ]);
    async function asUser(id: string) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec('set role authenticated');
    }
    async function scalar(sql: string, args: unknown[] = []) {
      const result = await db.query<Record<string, unknown>>(sql, args);
      return Object.values(result.rows[0])[0] as string;
    }
    await asUser(a);
    const wa = await scalar('select public.ensure_workspace()');
    assert.equal(await scalar('select public.ensure_workspace()'), wa);
    await asUser(b);
    const wb = await scalar('select public.ensure_workspace()');
    assert.notEqual(wa, wb);
    assert.equal(
      (await db.query('select id from public.workspaces where id=$1', [wa])).rows.length,
      0,
    );
    assert.equal(
      (await db.query('update public.workspaces set revision=1 where id=$1 returning id', [wa]))
        .rows.length,
      0,
    );
    await assert.rejects(db.query('select public.list_workspace_members($1)', [wa]));
    await assert.rejects(db.query('select public.create_workspace_invite($1)', [wa]));
    await assert.rejects(db.query('update public.workspaces set owner_id=$1 where id=$2', [b, wb]));
    await asUser(a);
    const code = await scalar('select public.create_workspace_invite($1)', [wa]);
    await asUser(b);
    assert.equal(await scalar('select public.accept_workspace_invite($1)', [code]), wa);
    await assert.rejects(db.query('select public.accept_workspace_invite($1)', [code]));
    assert.equal(
      (await db.query('select id from public.workspaces where id=$1', [wa])).rows.length,
      1,
    );
    assert.equal(
      (await db.query('select * from public.list_workspace_members($1)', [wa])).rows.length,
      2,
    );
    assert.equal(
      (
        await db.query(
          'update public.workspaces set revision=1 where id=$1 and revision=0 returning revision',
          [wa],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          'update public.workspaces set revision=2 where id=$1 and revision=0 returning revision',
          [wa],
        )
      ).rows.length,
      0,
    );
    for (let i = 0; i < 10; i++) await db.query('select public.consume_ai_quota()');
    await assert.rejects(db.query('select public.consume_ai_quota()'), /Rate limit/);
    await asUser(a);
    const expired = await scalar('select public.create_workspace_invite($1)', [wa]);
    await db.exec('reset role');
    await db.query(
      "update public.workspace_invites set expires_at=now()-interval '1 hour' where token=$1",
      [expired],
    );
    await asUser(b);
    await assert.rejects(db.query('select public.accept_workspace_invite($1)', [expired]));
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.workspaces'));
    await assert.rejects(db.query('select public.ensure_workspace()'));
  } finally {
    await db.close();
  }
});
