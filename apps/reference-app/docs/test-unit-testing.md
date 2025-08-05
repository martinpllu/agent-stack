# Unit Testing Guide

This guide covers best practices for writing unit tests using Vitest in this application.

## Setup

Unit tests use Vitest with the following configuration:
- Test environment: `jsdom` for React components
- Global test utilities from `@testing-library/react`
- Path alias `~` pointing to the `app` directory
- Automatic cleanup after each test

## Test File Naming

Unit tests should be placed alongside the code they test:
- `component.tsx` → `component.test.tsx`
- `utils.ts` → `utils.test.ts`
- `repository.ts` → `repository.test.ts`

## Writing Component Tests

### Basic Component Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './my-component';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Testing Props

```typescript
describe('Component Props', () => {
  it('should handle required props', () => {
    const props = {
      title: 'Test Title',
      onClick: vi.fn(),
    };
    
    render(<MyComponent {...props} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should handle optional props', () => {
    render(<MyComponent title="Test" />);
    
    // Component should render without optional props
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
describe('User Interactions', () => {
  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle form submission', async () => {
    const handleSubmit = vi.fn();
    render(<Form onSubmit={handleSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test Name' },
    });
    
    fireEvent.submit(screen.getByRole('form'));
    
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Test Name',
    });
  });
});
```

### Testing Conditional Rendering

```typescript
describe('Conditional Rendering', () => {
  it('should show loading state', () => {
    render(<DataComponent isLoading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Data')).not.toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<DataComponent error="Failed to load" />);
    
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should show data when loaded', () => {
    const data = { name: 'Test Data' };
    render(<DataComponent data={data} />);
    
    expect(screen.getByText('Test Data')).toBeInTheDocument();
  });
});
```

## Testing Utilities and Functions

### Pure Functions

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate, calculateTotal } from './utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15T10:00:00Z');
    expect(formatDate(date)).toBe('Jan 15, 2024');
  });

  it('should handle invalid dates', () => {
    expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
  });
});

describe('calculateTotal', () => {
  it('should sum array of numbers', () => {
    expect(calculateTotal([1, 2, 3, 4])).toBe(10);
  });

  it('should handle empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
});
```

### Functions with Side Effects

```typescript
describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save to localStorage', () => {
    saveToStorage('key', { value: 'test' });
    
    expect(localStorage.getItem('key')).toBe('{"value":"test"}');
  });

  it('should retrieve from localStorage', () => {
    localStorage.setItem('key', '{"value":"test"}');
    
    const result = getFromStorage('key');
    expect(result).toEqual({ value: 'test' });
  });
});
```

## Testing Repositories and Database Operations

### Mocking Database Calls

```typescript
import { vi } from 'vitest';
import { TaskRepository } from './task.repository';
import { db } from '../client';

// Mock the database client
vi.mock('../client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('TaskRepository', () => {
  let repository: TaskRepository;

  beforeEach(() => {
    repository = new TaskRepository();
    vi.clearAllMocks();
  });

  it('should create a task', async () => {
    const mockTask = { id: '1', title: 'Test' };
    const chainMock = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockTask]),
    };
    
    (db.insert as any).mockReturnValue(chainMock);

    const result = await repository.create({ title: 'Test' });
    
    expect(result).toEqual(mockTask);
  });
});
```

## Testing Hooks

### Custom Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './use-counter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());
    
    expect(result.current.count).toBe(0);
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

## Mocking Best Practices

### Mocking Modules

```typescript
// Mock an entire module
vi.mock('~/utils/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
}));

// Mock with factory function
vi.mock('~/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User' },
    isAuthenticated: true,
  }),
}));
```

### Mocking Environment Variables

```typescript
describe('with different environments', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use production API', () => {
    process.env.NODE_ENV = 'production';
    process.env.API_URL = 'https://api.production.com';
    
    const { apiUrl } = require('./config');
    expect(apiUrl).toBe('https://api.production.com');
  });
});
```

## Testing Async Operations

### Testing Promises

```typescript
it('should handle async operations', async () => {
  const mockData = { id: '1', name: 'Test' };
  const fetchData = vi.fn().mockResolvedValue(mockData);
  
  const result = await fetchData();
  
  expect(result).toEqual(mockData);
  expect(fetchData).toHaveBeenCalledTimes(1);
});

it('should handle async errors', async () => {
  const fetchData = vi.fn().mockRejectedValue(new Error('Network error'));
  
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

### Testing Loading States

```typescript
it('should show loading state during async operation', async () => {
  const { result, rerender } = renderHook(() => useAsyncData());
  
  // Initial state
  expect(result.current.loading).toBe(false);
  
  // Start loading
  act(() => {
    result.current.fetchData();
  });
  
  expect(result.current.loading).toBe(true);
  
  // Wait for completion
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
});
```

## Test Coverage

### Running Coverage Reports

```bash
# Generate coverage report
pnpm test --coverage

# View coverage in browser
pnpm test --coverage --ui
```

### Coverage Guidelines

- Aim for >80% coverage for critical business logic
- Focus on testing behavior, not implementation
- Don't test third-party libraries
- Exclude generated files and configs from coverage

## Common Testing Patterns

### Setup and Teardown

```typescript
describe('Feature', () => {
  let mockData: any;

  beforeAll(() => {
    // One-time setup
  });

  beforeEach(() => {
    // Setup before each test
    mockData = createMockData();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  afterAll(() => {
    // One-time cleanup
  });
});
```

### Parameterized Tests

```typescript
describe.each([
  ['primary', 'bg-primary'],
  ['secondary', 'bg-secondary'],
  ['destructive', 'bg-destructive'],
])('Button variant %s', (variant, expectedClass) => {
  it(`should have ${expectedClass} class`, () => {
    render(<Button variant={variant}>Test</Button>);
    expect(screen.getByRole('button')).toHaveClass(expectedClass);
  });
});
```

### Testing Error Boundaries

```typescript
it('should catch and display errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Debugging Tests

### Using Debug Utilities

```typescript
import { debug } from '@testing-library/react';

it('should debug component', () => {
  const { container } = render(<MyComponent />);
  
  // Print specific element
  debug(screen.getByRole('button'));
  
  // Print entire container
  debug(container);
});
```

### VSCode Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "autoAttachChildProcesses": true,
  "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
  "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
  "args": ["run", "${relativeFile}"],
  "smartStep": true,
  "console": "integratedTerminal"
}
```

## Best Practices Summary

1. **Test behavior, not implementation**
2. **Keep tests isolated and independent**
3. **Use descriptive test names**
4. **Follow AAA pattern: Arrange, Act, Assert**
5. **Mock external dependencies**
6. **Test edge cases and error scenarios**
7. **Keep tests simple and focused**
8. **Use data-testid sparingly**
9. **Prefer user-visible queries**
10. **Clean up after tests**