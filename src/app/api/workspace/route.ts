import { authenticate, failure, readJson } from '@/lib/server-auth';
import { applyMutation, dataSchema, mutationSchema } from '@/lib/schemas';
import { z } from 'zod';
export async function GET(request: Request) {
  try {
    const { db } = await authenticate(request);
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get('id'));
    const { data, error } = await db
      .from('workspaces')
      .select('id,name,state,revision')
      .eq('id', id)
      .single();
    if (error || !data)
      return Response.json({ error: 'Workspace unavailable or access denied.' }, { status: 403 });
    return Response.json({ ...data, state: dataSchema.parse(data.state) });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await authenticate(request);
    const body = await readJson(request);
    const id = z.string().uuid().parse(body.id),
      mutation = mutationSchema.parse(body.mutation);
    if (mutation.type === 'workspace/addBoard' && mutation.payload.ownerId !== user.id)
      return Response.json({ error: 'Invalid board owner' }, { status: 403 });
    const candidates =
      mutation.type === 'workspace/saveTask'
        ? [mutation.payload]
        : mutation.type === 'workspace/addTasks'
          ? mutation.payload
          : [];
    if (candidates.some((t) => t.assignee)) {
      const { data: members, error } = await db
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', id);
      if (
        error ||
        candidates.some((t) => t.assignee && !members?.some((m) => m.user_id === t.assignee))
      )
        return Response.json({ error: 'Assignee must be a workspace member' }, { status: 400 });
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: row, error } = await db
        .from('workspaces')
        .select('state,revision')
        .eq('id', id)
        .single();
      if (error || !row)
        return Response.json({ error: 'Workspace unavailable or access denied.' }, { status: 403 });
      let state;
      try {
        state = applyMutation(dataSchema.parse(row.state), mutation);
      } catch (e) {
        return Response.json(
          { error: e instanceof Error ? e.message : 'Conflict' },
          { status: 409 },
        );
      }
      const { data: updated, error: writeError } = await db
        .from('workspaces')
        .update({ state, revision: row.revision + 1 })
        .eq('id', id)
        .eq('revision', row.revision)
        .select('state,revision')
        .maybeSingle();
      if (writeError) throw Error(writeError.message);
      if (updated) return Response.json(updated);
    }
    return Response.json({ error: 'Workspace is busy. Please retry.' }, { status: 409 });
  } catch (e) {
    return failure(e);
  }
}
