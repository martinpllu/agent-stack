import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaskRepository } from './task.repository';
import { db } from '../client';
import type { Task, NewTask } from '../schema';
import type { CreateTaskInput, UpdateTaskInput, TaskStatus } from '~/model/task';

// Mock the database client
vi.mock('../client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ type: 'eq', a, b })),
  desc: vi.fn((field) => ({ type: 'desc', field })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  sql: vi.fn(),
}));

describe('TaskRepository', () => {
  let repository: TaskRepository;
  let mockDb: any;

  const mockTask: Task = {
    id: '123',
    userId: 'user123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    repository = new TaskRepository();
    mockDb = db as any;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should find tasks by user ID', async () => {
      const mockTasks = [mockTask, { ...mockTask, id: '456' }];
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTasks),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.findByUserId('user123');

      expect(mockDb.select).toHaveBeenCalled();
      expect(chainMock.from).toHaveBeenCalled();
      expect(chainMock.where).toHaveBeenCalled();
      expect(chainMock.orderBy).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });

    it('should filter by status when provided', async () => {
      const mockTasks = [{ ...mockTask, status: 'in_progress' as TaskStatus }];
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTasks),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.findByUserId('user123', { status: 'in_progress' });

      expect(result).toEqual(mockTasks);
      expect(chainMock.where).toHaveBeenCalled();
    });

    it('should return empty array when no tasks found', async () => {
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.findByUserId('user123');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find task by ID', async () => {
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTask]),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.findById('123');

      expect(mockDb.select).toHaveBeenCalled();
      expect(chainMock.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTask);
    });

    it('should return null when task not found', async () => {
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const input: CreateTaskInput & { userId: string } = {
        title: 'New Task',
        description: 'New Description',
        status: 'todo',
        userId: 'user123',
      };

      const chainMock = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockTask]),
      };
      
      mockDb.insert.mockReturnValue(chainMock);

      const result = await repository.create(input);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(chainMock.values).toHaveBeenCalledWith({
        title: input.title,
        description: input.description,
        status: input.status,
        userId: input.userId,
      });
      expect(result).toEqual(mockTask);
    });

    it('should use default status when not provided', async () => {
      const input: CreateTaskInput & { userId: string } = {
        title: 'New Task',
        description: 'New Description',
        userId: 'user123',
      };

      const chainMock = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockTask]),
      };
      
      mockDb.insert.mockReturnValue(chainMock);

      await repository.create(input);

      expect(chainMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'todo',
        })
      );
    });
  });

  describe('update', () => {
    it('should update an existing task', async () => {
      const input: UpdateTaskInput = {
        title: 'Updated Task',
        status: 'done',
      };

      const updatedTask = { ...mockTask, ...input };
      const chainMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedTask]),
      };
      
      mockDb.update.mockReturnValue(chainMock);

      const result = await repository.update('123', 'user123', input);

      expect(mockDb.update).toHaveBeenCalled();
      expect(chainMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ...input,
          updatedAt: expect.any(Date),
        })
      );
      expect(result).toEqual(updatedTask);
    });

    it('should return null when task not found', async () => {
      const chainMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      
      mockDb.update.mockReturnValue(chainMock);

      const result = await repository.update('nonexistent', 'user123', { title: 'Updated' });

      expect(result).toBeNull();
    });

    it('should update only provided fields', async () => {
      const input: UpdateTaskInput = {
        title: 'Only Title Updated',
      };

      const chainMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockTask]),
      };
      
      mockDb.update.mockReturnValue(chainMock);

      await repository.update('123', 'user123', input);

      expect(chainMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Only Title Updated',
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing task', async () => {
      // Mock the select check
      const selectChainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: '123' }]),
      };
      
      // Mock the delete operation
      const deleteChainMock = {
        where: vi.fn().mockResolvedValue(undefined),
      };
      
      mockDb.select.mockReturnValue(selectChainMock);
      mockDb.delete.mockReturnValue(deleteChainMock);

      const result = await repository.delete('123', 'user123');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when task not found', async () => {
      const selectChainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      
      mockDb.select.mockReturnValue(selectChainMock);

      const result = await repository.delete('nonexistent', 'user123');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should not delete task belonging to different user', async () => {
      const selectChainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      
      mockDb.select.mockReturnValue(selectChainMock);

      const result = await repository.delete('123', 'differentUser');

      expect(result).toBe(false);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe('getTasksByColumn', () => {
    it('should group tasks by status', async () => {
      const mockTasks = [
        { ...mockTask, id: '1', status: 'todo' as TaskStatus },
        { ...mockTask, id: '2', status: 'in_progress' as TaskStatus },
        { ...mockTask, id: '3', status: 'done' as TaskStatus },
        { ...mockTask, id: '4', status: 'todo' as TaskStatus },
      ];

      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTasks),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.getTasksByColumn('user123');

      expect(result.todo).toHaveLength(2);
      expect(result.in_progress).toHaveLength(1);
      expect(result.done).toHaveLength(1);
      expect(result.todo[0].id).toBe('1');
      expect(result.in_progress[0].id).toBe('2');
      expect(result.done[0].id).toBe('3');
    });

    it('should return empty arrays when no tasks', async () => {
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.getTasksByColumn('user123');

      expect(result.todo).toEqual([]);
      expect(result.in_progress).toEqual([]);
      expect(result.done).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should find all tasks', async () => {
      const allTasks = [
        mockTask,
        { ...mockTask, id: '456', userId: 'user456' },
        { ...mockTask, id: '789', userId: 'user789' },
      ];

      const chainMock = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(allTasks),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.findAll();

      expect(mockDb.select).toHaveBeenCalled();
      expect(chainMock.from).toHaveBeenCalled();
      expect(chainMock.orderBy).toHaveBeenCalled();
      expect(result).toEqual(allTasks);
    });

    it('should return empty array when no tasks exist', async () => {
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockDb.select.mockImplementation(() => {
        throw dbError;
      });

      await expect(repository.findByUserId('user123')).rejects.toThrow('Database connection failed');
    });

    it('should handle null values gracefully', async () => {
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([null]),
      };
      
      mockDb.select.mockReturnValue(chainMock);

      const result = await repository.findById('123');

      expect(result).toBeNull();
    });
  });
});