import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMutation, mutationSchema, type WorkspaceData } from '../src/lib/schemas';
const board = {
  id: 'board',
  name: 'Project',
  description: '',
  color: 'mint' as const,
  icon: 'Globe',
  owned: true,
  ownerId: '00000000-0000-4000-8000-000000000001',
  updated: 1,
};
const task = {
  id: 'task',
  boardId: 'board',
  title: 'First',
  description: '',
  column: 'Backlog' as const,
  priority: 'Medium' as const,
  due: '',
  assignee: '',
  label: '',
  created: 1,
  subtasks: [],
};
const state: WorkspaceData = { boards: [board], tasks: [task] };
test('stale task edit is rejected without overwriting another session', () => {
  assert.throws(
    () =>
      applyMutation(
        { ...state, tasks: [{ ...task, title: 'Changed remotely' }] },
        { type: 'workspace/saveTask', before: task, payload: { ...task, title: 'My stale edit' } },
      ),
    /another session/,
  );
  assert.equal(state.tasks[0].title, 'First');
});
test('changes on separate tasks preserve the other edit', () => {
  const next = applyMutation(
    { ...state, tasks: [task, { ...task, id: 'other', title: 'Remote change' }] },
    { type: 'workspace/moveTask', before: task, payload: { id: task.id, column: 'Done' } },
  );
  assert.equal(next.tasks[0].column, 'Done');
  assert.equal(next.tasks[1].title, 'Remote change');
});
test('AI batch apply is idempotent and preserves existing tasks', () => {
  const action = { type: 'workspace/addTasks' as const, payload: [{ ...task, id: 'ai' }] };
  const next = applyMutation(applyMutation(state, action), action);
  assert.equal(next.tasks.length, 2);
});
test('task cannot target a missing board', () =>
  assert.throws(
    () =>
      applyMutation(state, {
        type: 'workspace/addTasks',
        payload: [{ ...task, id: 'x', boardId: 'missing' }],
      }),
    /Board/,
  ));
test('rejects invalid priority, title and oversized AI batches', () => {
  assert.equal(
    mutationSchema.safeParse({
      type: 'workspace/saveTask',
      before: null,
      payload: { ...task, priority: 'Admin' },
    }).success,
    false,
  );
  assert.equal(
    mutationSchema.safeParse({
      type: 'workspace/saveTask',
      before: null,
      payload: { ...task, title: '' },
    }).success,
    false,
  );
  assert.equal(
    mutationSchema.safeParse({ type: 'workspace/addTasks', payload: Array(21).fill(task) }).success,
    false,
  );
});
