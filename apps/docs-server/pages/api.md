# API Documentation

This document provides comprehensive API endpoint documentation and usage examples for Agent Stack applications.

## Base Configuration

### Environment Setup

```bash
# .env
API_BASE_URL=https://api.example.com
API_VERSION=v1
API_TIMEOUT=30000
```

### API Client Setup

```typescript
// lib/api.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, timeout: number = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
);
```

## Authentication

### Login

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// POST /auth/login
const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  return apiClient.post('/auth/login', credentials);
};
```

### Register

```typescript
interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// POST /auth/register
const register = async (userData: RegisterRequest): Promise<LoginResponse> => {
  return apiClient.post('/auth/register', userData);
};
```

### Refresh Token

```typescript
interface RefreshTokenResponse {
  token: string;
}

// POST /auth/refresh
const refreshToken = async (): Promise<RefreshTokenResponse> => {
  return apiClient.post('/auth/refresh');
};
```

## User Management

### Get Current User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// GET /users/me
const getCurrentUser = async (): Promise<User> => {
  return apiClient.get('/users/me');
};
```

### Update User Profile

```typescript
interface UpdateUserRequest {
  name?: string;
  avatar?: string;
}

// PUT /users/me
const updateUser = async (data: UpdateUserRequest): Promise<User> => {
  return apiClient.put('/users/me', data);
};
```

### Upload Avatar

```typescript
// POST /users/me/avatar
const uploadAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  return apiClient.post('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
```

## Posts Management

### List Posts

```typescript
interface PostsQuery {
  page?: number;
  limit?: number;
  search?: string;
  published?: boolean;
  authorId?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  author: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// GET /posts
const getPosts = async (query: PostsQuery = {}): Promise<PostsResponse> => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });
  
  return apiClient.get(`/posts?${params.toString()}`);
};
```

### Get Single Post

```typescript
// GET /posts/:id
const getPost = async (id: string): Promise<Post> => {
  return apiClient.get(`/posts/${id}`);
};
```

### Create Post

```typescript
interface CreatePostRequest {
  title: string;
  content: string;
  published?: boolean;
}

// POST /posts
const createPost = async (data: CreatePostRequest): Promise<Post> => {
  return apiClient.post('/posts', data);
};
```

### Update Post

```typescript
interface UpdatePostRequest {
  title?: string;
  content?: string;
  published?: boolean;
}

// PUT /posts/:id
const updatePost = async (id: string, data: UpdatePostRequest): Promise<Post> => {
  return apiClient.put(`/posts/${id}`, data);
};
```

### Delete Post

```typescript
// DELETE /posts/:id
const deletePost = async (id: string): Promise<void> => {
  return apiClient.delete(`/posts/${id}`);
};
```

## File Upload

### Upload File

```typescript
interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// POST /files/upload
const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload progress: ${percentCompleted}%`);
    },
  });
};
```

### Delete File

```typescript
// DELETE /files/:filename
const deleteFile = async (filename: string): Promise<void> => {
  return apiClient.delete(`/files/${filename}`);
};
```

## Search

### Global Search

```typescript
interface SearchQuery {
  q: string;
  type?: 'posts' | 'users' | 'all';
  limit?: number;
}

interface SearchResult {
  posts: Post[];
  users: User[];
  total: number;
}

// GET /search
const search = async (query: SearchQuery): Promise<SearchResult> => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });
  
  return apiClient.get(`/search?${params.toString()}`);
};
```

## React Hooks

### Custom API Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Use posts
export const usePosts = (query: PostsQuery = {}) => {
  return useQuery({
    queryKey: ['posts', query],
    queryFn: () => getPosts(query),
  });
};

// Use single post
export const usePost = (id: string) => {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => getPost(id),
    enabled: !!id,
  });
};

// Create post mutation
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// Update post mutation
export const useUpdatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostRequest }) =>
      updatePost(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', id] });
    },
  });
};

// Delete post mutation
export const useDeletePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
```

## Error Handling

### API Error Types

```typescript
interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

class ApiErrorHandler {
  static handle(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'Server error',
        code: error.response.data?.code || 'SERVER_ERROR',
        statusCode: error.response.status,
        details: error.response.data?.details,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error - no response from server',
        code: 'NETWORK_ERROR',
        statusCode: 0,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'Unknown error',
        code: 'UNKNOWN_ERROR',
        statusCode: 0,
      };
    }
  }
}
```

### Error Boundary for API Errors

```typescript
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: ApiError;
}

export class ApiErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return {
      hasError: true,
      error: ApiErrorHandler.handle(error),
    };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('API Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Rate Limiting

### Implementation

```typescript
// Rate limiting middleware (server-side)
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit auth attempts
  skipSuccessfulRequests: true,
});
```

## Best Practices

1. **Use TypeScript** for type safety and better developer experience
2. **Implement proper error handling** with consistent error responses
3. **Use pagination** for list endpoints to improve performance
4. **Implement caching** with React Query or SWR
5. **Add request/response logging** for debugging and monitoring
6. **Use environment variables** for configuration
7. **Implement rate limiting** to prevent abuse
8. **Validate input data** on both client and server sides
9. **Use proper HTTP status codes** for different scenarios
10. **Document all endpoints** with examples and response schemas 