import { z } from 'zod';
export const taskSchema = z.object({
  id: z.string().min(1).max(100),
  boardId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10000),
  column: z.enum(['Backlog', 'To do', 'In progress', 'In review', 'Done']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  due: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  assignee: z.string().max(100),
  label: z.string().max(30),
  created: z.number().finite(),
  subtasks: z.array(z.object({ title: z.string().min(1).max(300), done: z.boolean() })).max(100),
});
export const boardSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500),
  color: z.enum(['mint', 'purple', 'peach', 'blue']),
  icon: z.string().max(40),
  owned: z.boolean(),
  ownerId: z.string().uuid(),
  updated: z.number().finite(),
});
export const dataSchema = z.object({
  boards: z.array(boardSchema).max(100),
  tasks: z.array(taskSchema).max(3000),
});
export const mutationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('workspace/addBoard'), payload: boardSchema }),
  z.object({
    type: z.literal('workspace/saveTask'),
    payload: taskSchema,
    before: taskSchema.nullable(),
  }),
  z.object({
    type: z.literal('workspace/moveTask'),
    payload: z.object({ id: z.string(), column: taskSchema.shape.column }),
    before: taskSchema.nullable(),
  }),
  z.object({ type: z.literal('workspace/addTasks'), payload: z.array(taskSchema).min(1).max(20) }),
]);
export type WorkspaceData = z.infer<typeof dataSchema>;
export function applyMutation(
  data: WorkspaceData,
  m: z.infer<typeof mutationSchema>,
): WorkspaceData {
  const next = structuredClone(data);
  if (m.type === 'workspace/addBoard') {
    if (next.boards.some((b) => b.id === m.payload.id)) return next;
    next.boards.push(m.payload);
  } else if (m.type === 'workspace/addTasks') {
    for (const t of m.payload) {
      if (!next.boards.some((b) => b.id === t.boardId)) throw Error('Board no longer exists');
      if (!next.tasks.some((x) => x.id === t.id)) next.tasks.push(t);
    }
  } else {
    const i = next.tasks.findIndex((t) => t.id === m.payload.id),
      current = next.tasks[i] || null;
    if (JSON.stringify(current) !== JSON.stringify(m.before))
      throw Error('This task changed in another session. Reopen it and try again.');
    if (m.type === 'workspace/saveTask') {
      if (!next.boards.some((b) => b.id === m.payload.boardId))
        throw Error('Board no longer exists');
      if (i < 0) next.tasks.push(m.payload);
      else next.tasks[i] = m.payload;
    } else {
      if (i < 0) throw Error('Task no longer exists');
      next.tasks[i].column = m.payload.column;
    }
  }
  return dataSchema.parse(next);
}
