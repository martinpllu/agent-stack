import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../client";
import { tasks, type Task, type NewTask } from "../schema";
import type { CreateTaskInput, UpdateTaskInput, TaskStatus } from "~/model/task";

export class TaskRepository {
  async findByUserId(userId: string, filters?: { status?: TaskStatus }): Promise<Task[]> {
    const conditions = [eq(tasks.userId, userId)];
    
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    
    return await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));
  }

  async findById(id: string): Promise<Task | null> {
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async create(input: CreateTaskInput & { userId: string }): Promise<Task> {
    const newTask: NewTask = {
      title: input.title,
      description: input.description,
      status: input.status || "todo",
      userId: input.userId,
    };

    const [task] = await db
      .insert(tasks)
      .values(newTask)
      .returning();
    
    return task;
  }

  async update(id: string, userId: string, input: UpdateTaskInput): Promise<Task | null> {
    const [updated] = await db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    
    return updated || null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    // First check if the task exists and belongs to the user
    const existingTask = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .limit(1);
    
    if (existingTask.length === 0) {
      return false;
    }
    
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    
    return true;
  }

  async getTasksByColumn(userId: string) {
    const allTasks = await this.findByUserId(userId);
    
    return {
      todo: allTasks.filter(task => task.status === "todo"),
      "in_progress": allTasks.filter(task => task.status === "in_progress"),
      done: allTasks.filter(task => task.status === "done"),
    };
  }

  async findAll(): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt));
  }
}

export const taskRepository = new TaskRepository(); 