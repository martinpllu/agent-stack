import { test, expect } from '@playwright/test';
import { createPageObjects, type PageObjects } from './pages';
import { createTestUsers, startCodeCapture } from './auth-test-utils';
import { TestDataFactory } from './data-test-utils';
import { testData } from './test-utils';

/**
 * E2E tests for Task Management feature
 * Demonstrates best practices:
 * - Page Object Model usage
 * - Test data factory pattern
 * - Proper setup and teardown
 * - Clear test structure with arrange-act-assert
 * - Descriptive test names
 */

// Test fixtures
let pages: PageObjects;
let dataFactory: TestDataFactory;
let codeCapture: ReturnType<typeof startCodeCapture>;

// Test data
const testUser = {
  email: testData.generateEmail('tasks-test'),
  isAdmin: true,  // Make the user an admin to ensure access
};

test.describe('Task Management', () => {
  test.beforeAll(async () => {
    // Set up test data factory
    dataFactory = new TestDataFactory();
    
    // Create test user
    await createTestUsers([testUser]);
    
    // Start code capture for authentication
    codeCapture = startCodeCapture();
  });

  test.afterAll(async () => {
    // Clean up test data
    await dataFactory.cleanup();
    codeCapture.stop();
  });

  test.beforeEach(async ({ page }) => {
    // Create page objects for each test
    pages = createPageObjects(page);
    
    // Log in before each test
    await pages.login.goto();
    await pages.login.requestLoginCode(testUser.email);
    const code = await codeCapture.getCode(testUser.email);
    await pages.login.verifyCode(code);
    
    // Wait for redirect after login
    await page.waitForURL('**/');
  });

  test.describe('Creating Tasks', () => {
    test('should create a new task with all fields', async ({ page }) => {
      // Arrange
      const taskData = testData.generateTask({
        title: 'E2E Test Task',
        description: 'This is a test task created by E2E test',
        priority: 'high',
      });

      // Act
      await pages.tasks.goto();
      await pages.tasks.createTask(taskData);

      // Assert
      await pages.tasks.expectTaskVisible(taskData.title);
      await pages.tasks.expectTaskHasPriority(taskData.title, 'high');
      await pages.tasks.expectTaskHasStatus(taskData.title, 'pending');
    });

    test('should show validation errors for empty title', async ({ page }) => {
      // Act
      await pages.tasks.goto();
      await pages.tasks.createTaskButton.click();
      await pages.tasks.saveTaskButton.click();

      // Assert
      await pages.tasks.expectErrorMessage('Title is required');
      await expect(pages.tasks.taskDialog).toBeVisible();
    });

    test('should create multiple tasks and display them in order', async ({ page }) => {
      // Arrange
      const tasks = [
        testData.generateTask({ title: 'First Task', priority: 'high' }),
        testData.generateTask({ title: 'Second Task', priority: 'medium' }),
        testData.generateTask({ title: 'Third Task', priority: 'low' }),
      ];

      // Act
      await pages.tasks.goto();
      for (const task of tasks) {
        await pages.tasks.createTask(task);
      }

      // Assert
      await pages.tasks.expectTaskCount(3);
      for (const task of tasks) {
        await pages.tasks.expectTaskVisible(task.title);
      }
    });
  });

  test.describe('Updating Tasks', () => {
    test('should edit task details', async ({ page }) => {
      // Arrange
      const originalTask = testData.generateTask({ 
        title: 'Task to Edit',
        priority: 'low' 
      });
      await pages.tasks.goto();
      await pages.tasks.createTask(originalTask);

      // Act
      await pages.tasks.editTask(originalTask.title);
      await pages.tasks.titleInput.fill('Updated Task Title');
      await pages.tasks.prioritySelect.selectOption('high');
      await pages.tasks.saveTaskButton.click();

      // Assert
      await pages.tasks.expectTaskNotVisible(originalTask.title);
      await pages.tasks.expectTaskVisible('Updated Task Title');
      await pages.tasks.expectTaskHasPriority('Updated Task Title', 'high');
    });

    test('should mark task as completed', async ({ page }) => {
      // Arrange
      const task = testData.generateTask({ title: 'Task to Complete' });
      await pages.tasks.goto();
      await pages.tasks.createTask(task);

      // Act
      await pages.tasks.toggleTaskComplete(task.title);

      // Assert
      const taskElement = pages.tasks.getTaskByTitle(task.title);
      await expect(taskElement).toHaveAttribute('data-completed', 'true');
      expect(await pages.tasks.isTaskCompleted(task.title)).toBe(true);
    });

    test('should change task status through edit dialog', async ({ page }) => {
      // Arrange
      const task = testData.generateTask({ title: 'Status Change Task' });
      await pages.tasks.goto();
      await pages.tasks.createTask(task);

      // Act
      await pages.tasks.editTask(task.title);
      await pages.tasks.statusSelect.selectOption('in_progress');
      await pages.tasks.saveTaskButton.click();

      // Assert
      await pages.tasks.expectTaskHasStatus(task.title, 'in_progress');
    });
  });

  test.describe('Deleting Tasks', () => {
    test('should delete a task with confirmation', async ({ page }) => {
      // Arrange
      const task = testData.generateTask({ title: 'Task to Delete' });
      await pages.tasks.goto();
      await pages.tasks.createTask(task);
      await pages.tasks.expectTaskVisible(task.title);

      // Act
      await pages.tasks.deleteTask(task.title);

      // Assert
      await pages.tasks.expectTaskNotVisible(task.title);
      const taskCount = await pages.tasks.getTaskCount();
      expect(taskCount).toBe(0);
    });

    test('should cancel task deletion', async ({ page }) => {
      // Arrange
      const task = testData.generateTask({ title: 'Task to Keep' });
      await pages.tasks.goto();
      await pages.tasks.createTask(task);

      // Act
      const taskElement = await pages.tasks.getTaskByTitle(task.title);
      await taskElement.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Assert
      await pages.tasks.expectTaskVisible(task.title);
    });
  });

  test.describe('Filtering and Searching', () => {
    test('should filter tasks by status', async ({ page }) => {
      // Arrange
      const tasks = [
        { ...testData.generateTask({ title: 'Pending Task' }), status: 'pending' as const },
        { ...testData.generateTask({ title: 'In Progress Task' }), status: 'in_progress' as const },
        { ...testData.generateTask({ title: 'Completed Task' }), status: 'completed' as const },
      ];
      
      await pages.tasks.goto();
      for (const task of tasks) {
        await pages.tasks.createTask(task);
      }

      // Act & Assert - Filter by pending
      await pages.tasks.filterByStatus('pending');
      await pages.tasks.expectTaskVisible('Pending Task');
      await pages.tasks.expectTaskNotVisible('In Progress Task');
      await pages.tasks.expectTaskNotVisible('Completed Task');

      // Act & Assert - Filter by in_progress
      await pages.tasks.filterByStatus('in_progress');
      await pages.tasks.expectTaskNotVisible('Pending Task');
      await pages.tasks.expectTaskVisible('In Progress Task');
      await pages.tasks.expectTaskNotVisible('Completed Task');

      // Act & Assert - Show all
      await pages.tasks.filterByStatus('all');
      await pages.tasks.expectTaskCount(3);
    });

    test('should search tasks by title', async ({ page }) => {
      // Arrange
      const tasks = [
        testData.generateTask({ title: 'Important Meeting' }),
        testData.generateTask({ title: 'Code Review' }),
        testData.generateTask({ title: 'Important Document' }),
      ];
      
      await pages.tasks.goto();
      for (const task of tasks) {
        await pages.tasks.createTask(task);
      }

      // Act
      await pages.tasks.searchTasks('Important');

      // Assert
      await pages.tasks.expectTaskVisible('Important Meeting');
      await pages.tasks.expectTaskVisible('Important Document');
      await pages.tasks.expectTaskNotVisible('Code Review');
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no tasks exist', async ({ page }) => {
      // Act
      await pages.tasks.goto();

      // Assert
      await pages.tasks.expectEmptyState();
      await expect(pages.tasks.emptyState).toContainText('No tasks yet');
      await expect(pages.tasks.createTaskButton).toBeVisible();
    });
  });

  test.describe('Task Persistence', () => {
    test('should persist tasks after page reload', async ({ page }) => {
      // Arrange
      const task = testData.generateTask({ 
        title: 'Persistent Task',
        description: 'This task should persist after reload' 
      });
      
      await pages.tasks.goto();
      await pages.tasks.createTask(task);
      await pages.tasks.expectTaskVisible(task.title);

      // Act
      await page.reload();
      await pages.tasks.waitForPageLoad();

      // Assert
      await pages.tasks.expectTaskVisible(task.title);
      const taskDetails = await pages.tasks.getTaskDetails(task.title);
      expect(taskDetails.description).toContain('This task should persist');
    });

    test('should maintain task state across navigation', async ({ page }) => {
      // Arrange
      const task = testData.generateTask({ title: 'Navigation Test Task' });
      await pages.tasks.goto();
      await pages.tasks.createTask(task);
      await pages.tasks.toggleTaskComplete(task.title);

      // Act
      await pages.home.goto();
      await pages.tasks.goto();

      // Assert
      await pages.tasks.expectTaskVisible(task.title);
      expect(await pages.tasks.isTaskCompleted(task.title)).toBe(true);
    });
  });
});