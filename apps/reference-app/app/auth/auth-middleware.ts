import { redirect } from "react-router";
import { requireAuth, requireValidatedUser, requireAdmin } from "./auth-server";
import { AuthError, handleAuthError } from "~/utils/error-handler";
import type { FlatUser } from "~/types/user";

export type AuthRole = "user" | "admin";

export interface AuthOptions {
  validated?: boolean;
}

export async function requireRole(
  role: AuthRole, 
  request: Request, 
  options: AuthOptions = {}
) {
  // Start with basic auth check
  const { user, headers } = await requireAuth(request);
  
  // Check validation if required
  if (options.validated && !user.properties.isValidated) {
    throw AuthError.notValidated();
  }
  
  // Check role permissions  
  if (role === "admin" && !user.properties.isAdmin) {
    throw AuthError.adminRequired();
  }
  
  return { user, headers };
}

// Convenience functions for common use cases
export async function requireValidatedUserRole(request: Request) {
  try {
    const result = await requireRole("user", request, { validated: true });
    
    // Return the user object with properties flattened for easier access
    const flatUser: FlatUser = {
      id: result.user.properties.id,
      email: result.user.properties.email,
      isValidated: result.user.properties.isValidated,
      isAdmin: result.user.properties.isAdmin
    };
    
    return { user: flatUser, headers: result.headers };
  } catch (error) {
    throw handleAuthError(error);
  }
}

export async function requireAdminRole(request: Request) {
  try {
    return await requireRole("admin", request);
  } catch (error) {
    throw handleAuthError(error);
  }
}

// Route-level middleware helpers
export function createAuthLoader(
  role: AuthRole,
  options: AuthOptions = {}
) {
  return async ({ request }: { request: Request }) => {
    try {
      const { user, headers } = await requireRole(role, request, options);
      
      const flatUser: FlatUser = {
        id: user.properties.id,
        email: user.properties.email,
        isValidated: user.properties.isValidated,
        isAdmin: user.properties.isAdmin
      };
      
      return { user: flatUser, headers };
    } catch (error) {
      throw handleAuthError(error);
    }
  };
}

export function createAuthAction(
  role: AuthRole,
  options: AuthOptions = {}
) {
  return <T>(handler: (args: { request: Request; user: FlatUser; headers: Headers | null }) => Promise<T>) => {
    return async ({ request }: { request: Request }) => {
      try {
        const { user, headers } = await requireRole(role, request, options);
        
        const flatUser: FlatUser = {
          id: user.properties.id,
          email: user.properties.email,
          isValidated: user.properties.isValidated,
          isAdmin: user.properties.isAdmin
        };
        
        return await handler({ request, user: flatUser, headers });
      } catch (error) {
        throw handleAuthError(error);
      }
    };
  };
} 