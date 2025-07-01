import { eq, desc, and, or } from "drizzle-orm";
import { db } from "../db/client";
import { tasks, users, type Task, type NewTask } from "../db/schema";
import type { CreateTaskInput, UpdateTaskInput, TaskStatus } from "../types/task";

export class TaskRepository {
  async findAll(filters?: { status?: TaskStatus; assigneeId?: string }) {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    
    if (filters?.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }
    
    const query = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        assigneeName: users.name,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdById: tasks.createdById,
        createdByName: users.name,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .orderBy(desc(tasks.createdAt));
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  async findById(id: string) {
    const result = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        assigneeName: users.name,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdById: tasks.createdById,
        createdByName: users.name,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async create(input: CreateTaskInput & { createdById: string }): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description,
        status: input.status,
        assigneeId: input.assigneeId,
        createdById: input.createdById,
      })
      .returning();
    
    return task;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const [updated] = await db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    
    return updated || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.count > 0;
  }

  async getTasksByColumn() {
    const allTasks = await this.findAll();
    
    return {
      backlog: allTasks.filter(task => task.status === "backlog"),
      "in-progress": allTasks.filter(task => task.status === "in-progress"),
      done: allTasks.filter(task => task.status === "done"),
    };
  }
}

export const taskRepository = new TaskRepository(); 