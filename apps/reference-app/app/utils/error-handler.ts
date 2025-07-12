import { redirect } from "react-router";

/**
 * Standardized error types for the application
 */
export enum ErrorType {
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION", 
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  BAD_REQUEST = "BAD_REQUEST"
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  type: ErrorType;
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  type: ErrorType,
  message: string,
  status: number,
  code?: string,
  details?: unknown
): Response {
  const errorResponse: ErrorResponse = {
    type,
    message,
    status,
    code,
    details
  };

  // Log server errors for debugging
  if (status >= 500) {
    console.error(`[${type}] ${message}`, { code, details });
  } else {
    console.warn(`[${type}] ${message}`, { code, details });
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

/**
 * Authentication-specific error responses
 */
export const AuthError = {
  unauthorized: (message = "Authentication required") =>
    createErrorResponse(ErrorType.AUTHENTICATION, message, 401, "AUTH_REQUIRED"),
    
  forbidden: (message = "Access denied") =>
    createErrorResponse(ErrorType.AUTHORIZATION, message, 403, "ACCESS_DENIED"),
    
  notValidated: (message = "Account not validated") =>
    createErrorResponse(ErrorType.AUTHORIZATION, message, 403, "NOT_VALIDATED"),
    
  adminRequired: (message = "Admin access required") =>
    createErrorResponse(ErrorType.AUTHORIZATION, message, 403, "ADMIN_REQUIRED"),
};

/**
 * General error responses
 */
export const AppError = {
  badRequest: (message: string, details?: unknown) =>
    createErrorResponse(ErrorType.BAD_REQUEST, message, 400, "BAD_REQUEST", details),
    
  notFound: (message = "Resource not found") =>
    createErrorResponse(ErrorType.NOT_FOUND, message, 404, "NOT_FOUND"),
    
  validation: (message: string, details?: unknown) =>
    createErrorResponse(ErrorType.VALIDATION, message, 400, "VALIDATION_ERROR", details),
    
  serverError: (message = "Internal server error", details?: unknown) =>
    createErrorResponse(ErrorType.SERVER_ERROR, message, 500, "SERVER_ERROR", details),
};

/**
 * Handles errors consistently across the application
 * - If it's a Response (redirect), re-throw it
 * - If it's an expected error, convert to standard format
 * - If it's unexpected, log and return generic server error
 */
export function handleError(error: unknown, context?: string): Response {
  const contextPrefix = context ? `[${context}] ` : "";
  
  // Re-throw Response objects (redirects, etc.)
  if (error instanceof Response) {
    return error;
  }
  
  // Handle known Error types
  if (error instanceof Error) {
    console.error(`${contextPrefix}Error:`, error.message, error.stack);
    return AppError.serverError(`${contextPrefix}${error.message}`);
  }
  
  // Handle unknown errors
  console.error(`${contextPrefix}Unknown error:`, error);
  return AppError.serverError(`${contextPrefix}An unexpected error occurred`);
}

/**
 * Wraps async functions with consistent error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, context);
    }
  };
}

/**
 * Handles authentication redirects consistently
 */
export function handleAuthError(error: unknown): Response {
  if (error instanceof Response) {
    // If it's already a Response with 401, redirect to login
    if (error.status === 401) {
      return redirect("/auth/login");
    }
    return error;
  }
  
  // For other errors, create proper auth error
  if (error instanceof Error) {
    console.error("Auth error:", error.message);
    return redirect("/auth/login");
  }
  
  console.error("Unknown auth error:", error);
  return redirect("/auth/login");
}