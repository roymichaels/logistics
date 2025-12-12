import { sxtExecute, sxtQuery } from '../client';
import type { Task } from '../../data/types';

type TaskFilter = { businessId?: string; status?: string };
type TaskPatch = Partial<Task & { business_id?: string; driver_id?: string }>;

export async function listTasks(filter?: TaskFilter): Promise<Task[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.businessId) {
    clauses.push(`business_id = $${params.length + 1}`);
    params.push(filter.businessId);
  }

  if (filter?.status) {
    clauses.push(`status = $${params.length + 1}`);
    params.push(filter.status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  return sxtQuery<Task>(
    `SELECT * FROM tasks ${where} ORDER BY created_at DESC;`,
    params
  );
}

export async function getTask(id: string): Promise<Task | null> {
  const rows = await sxtQuery<Task>('SELECT * FROM tasks WHERE id = $1 LIMIT 1;', [id]);
  return rows[0] ?? null;
}

export async function createTask(input: {
  businessId: string;
  driverId?: string;
  title: string;
  status: string;
}): Promise<Task> {
  const { businessId, driverId, title, status } = input;
  const id = crypto.randomUUID();

  await sxtExecute(
    `
    INSERT INTO tasks (
      id, business_id, driver_id, title, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, NOW(), NOW()
    );
    `,
    [id, businessId, driverId ?? null, title, status]
  );

  const created = await getTask(id);
  if (!created) {
    throw new Error('Failed to create task');
  }
  return created;
}

export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const entries = Object.entries(patch ?? {}).filter(([, v]) => v !== undefined);
  entries.forEach(([key, value], idx) => {
    fields.push(`${key} = $${idx + 1}`);
    values.push(value);
  });

  if (fields.length === 0) {
    const existing = await getTask(id);
    if (!existing) throw new Error('Task not found');
    return existing;
  }

  fields.push(`updated_at = $${fields.length + 1}`);
  values.push(new Date().toISOString());

  values.push(id);

  await sxtExecute(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${fields.length + 1};`,
    values
  );

  const updated = await getTask(id);
  if (!updated) {
    throw new Error('Failed to update task');
  }
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  await sxtExecute('DELETE FROM tasks WHERE id = $1;', [id]);
}

export async function assignTaskToDriver(taskId: string, driverId: string): Promise<void> {
  await sxtExecute(
    `
    UPDATE tasks
    SET driver_id = $1, updated_at = NOW()
    WHERE id = $2;
    `,
    [driverId, taskId]
  );
}

export async function logTaskEvent(input: {
  taskId: string;
  event: string;
  metadata?: string;
}): Promise<void> {
  const { taskId, event, metadata } = input;
  await sxtExecute(
    `
    INSERT INTO task_events (id, task_id, event, metadata, created_at)
    VALUES ($1, $2, $3, $4, NOW());
    `,
    [crypto.randomUUID(), taskId, event, metadata ?? null]
  );
}
