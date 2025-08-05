import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskCard } from './task-card';
import type { Task } from '~/model/task';

// Mock the UI components
vi.mock('~/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardDescription: ({ children, className, ...props }: any) => (
    <p className={className} {...props}>{children}</p>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
}));

describe('TaskCard Component', () => {
  const mockTask: Task = {
    id: '1',
    userId: 'user123',
    title: 'Test Task',
    description: 'This is a test task description',
    status: 'todo',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render task title', () => {
      render(<TaskCard task={mockTask} />);
      
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should render task description when provided', () => {
      render(<TaskCard task={mockTask} />);
      
      expect(screen.getByText('This is a test task description')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const taskWithoutDescription = {
        ...mockTask,
        description: '',
      };
      
      render(<TaskCard task={taskWithoutDescription} />);
      
      expect(screen.queryByText('This is a test task description')).not.toBeInTheDocument();
    });

    it('should render creation date', () => {
      render(<TaskCard task={mockTask} />);
      
      // The component uses toLocaleDateString(), which can vary by locale
      // So we check for the presence of the date elements
      expect(screen.getByText(/Created/)).toBeInTheDocument();
      expect(screen.getByText(/1\/15\/2024|15\/1\/2024|2024/)).toBeInTheDocument();
    });

    it('should have hover effect classes', () => {
      const { container } = render(<TaskCard task={mockTask} />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('cursor-pointer', 'hover:shadow-md', 'transition-shadow');
    });
  });

  describe('Task Status', () => {
    it('should render todo status with correct styling', () => {
      render(<TaskCard task={mockTask} />);
      
      const statusElement = screen.getByText('todo');
      expect(statusElement).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should render in_progress status with correct styling', () => {
      const inProgressTask = {
        ...mockTask,
        status: 'in_progress' as const,
      };
      
      render(<TaskCard task={inProgressTask} />);
      
      const statusElement = screen.getByText('in progress');
      expect(statusElement).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should render done status with correct styling', () => {
      const doneTask = {
        ...mockTask,
        status: 'done' as const,
      };
      
      render(<TaskCard task={doneTask} />);
      
      const statusElement = screen.getByText('done');
      expect(statusElement).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should replace underscores with spaces in status', () => {
      const inProgressTask = {
        ...mockTask,
        status: 'in_progress' as const,
      };
      
      render(<TaskCard task={inProgressTask} />);
      
      expect(screen.getByText('in progress')).toBeInTheDocument();
      expect(screen.queryByText('in_progress')).not.toBeInTheDocument();
    });
  });

  describe('Description handling', () => {
    it('should apply line-clamp class to long descriptions', () => {
      const longDescriptionTask = {
        ...mockTask,
        description: 'This is a very long description that would normally take up multiple lines and should be truncated with the line-clamp-2 class to ensure consistent card heights',
      };
      
      render(<TaskCard task={longDescriptionTask} />);
      
      const description = screen.getByText(longDescriptionTask.description);
      expect(description).toHaveClass('line-clamp-2');
    });

    it('should handle empty description gracefully', () => {
      const emptyDescriptionTask = {
        ...mockTask,
        description: '',
      };
      
      const { container } = render(<TaskCard task={emptyDescriptionTask} />);
      
      // Should not render an empty paragraph
      const descriptions = container.querySelectorAll('.line-clamp-2');
      expect(descriptions).toHaveLength(0);
    });
  });

  describe('Date formatting', () => {
    it('should format dates correctly for different locales', () => {
      // Save original toLocaleDateString
      const originalToLocaleDateString = Date.prototype.toLocaleDateString;
      
      // Mock toLocaleDateString to return a consistent format
      Date.prototype.toLocaleDateString = function() {
        return '1/15/2024';
      };
      
      render(<TaskCard task={mockTask} />);
      
      expect(screen.getByText('Created 1/15/2024')).toBeInTheDocument();
      
      // Restore original function
      Date.prototype.toLocaleDateString = originalToLocaleDateString;
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDateTask = {
        ...mockTask,
        createdAt: new Date('invalid'),
      };
      
      render(<TaskCard task={invalidDateTask} />);
      
      // Should render but with "Invalid Date"
      expect(screen.getByText(/Created/)).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should have correct layout structure', () => {
      const { container } = render(<TaskCard task={mockTask} />);
      
      // Check for card structure
      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      
      // Check for header with title
      const header = card.querySelector('.pb-3');
      expect(header).toBeInTheDocument();
      
      // Check for content with metadata
      const content = card.querySelector('.pt-0');
      expect(content).toBeInTheDocument();
    });

    it('should render calendar icon', () => {
      render(<TaskCard task={mockTask} />);
      
      // Lucide icons render as SVG elements
      const calendarIcon = document.querySelector('svg');
      expect(calendarIcon).toBeInTheDocument();
      expect(calendarIcon).toHaveClass('h-3', 'w-3');
    });

    it('should apply correct text sizing', () => {
      render(<TaskCard task={mockTask} />);
      
      // Check metadata text size
      const metadataContainer = screen.getByText(/Created/).parentElement?.parentElement;
      expect(metadataContainer).toHaveClass('text-xs', 'text-muted-foreground');
      
      // Check status badge text size
      const statusBadge = screen.getByText('todo');
      expect(statusBadge).toHaveClass('text-xs', 'font-medium');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitleTask = {
        ...mockTask,
        title: 'This is an extremely long task title that might cause layout issues if not handled properly',
      };
      
      render(<TaskCard task={longTitleTask} />);
      
      const title = screen.getByText(longTitleTask.title);
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('leading-tight');
    });

    it('should handle special characters in content', () => {
      const specialCharsTask = {
        ...mockTask,
        title: 'Task with <special> & "characters"',
        description: 'Description with émojis 🎉 and symbols €$¥',
      };
      
      render(<TaskCard task={specialCharsTask} />);
      
      expect(screen.getByText('Task with <special> & "characters"')).toBeInTheDocument();
      expect(screen.getByText('Description with émojis 🎉 and symbols €$¥')).toBeInTheDocument();
    });

    it('should handle all task fields being at minimum values', () => {
      const minimalTask: Task = {
        id: '',
        userId: '',
        title: '',
        description: '',
        status: 'todo',
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };
      
      render(<TaskCard task={minimalTask} />);
      
      // Should still render without crashing
      expect(screen.getByText('todo')).toBeInTheDocument();
    });
  });
});