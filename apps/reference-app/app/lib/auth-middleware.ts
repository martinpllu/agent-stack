import { redirect } from "react-router";
import { requireAuth, requireValidatedUser, requireAdmin } from "./auth-server";

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
    throw new Response("Account not validated", { 
      status: 403,
      headers: headers || undefined
    });
  }
  
  // Check role permissions  
  if (role === "admin" && !user.properties.isAdmin) {
    throw new Response("Admin access required", { 
      status: 403,
      headers: headers || undefined
    });
  }
  
  return { user, headers };
}

// Convenience functions for common use cases
export async function requireValidatedUserRole(request: Request) {
  const result = await requireRole("user", request, { validated: true });
  // Return the user object with properties flattened for easier access
  return {
    user: {
      id: result.user.properties.id,
      email: result.user.properties.email,
      isValidated: result.user.properties.isValidated,
      isAdmin: result.user.properties.isAdmin
    },
    headers: result.headers
  };
}

export async function requireAdminRole(request: Request) {
  return requireRole("admin", request);
}

// Route-level middleware helpers
export function createAuthLoader(
  role: AuthRole,
  options: AuthOptions = {}
) {
  return async ({ request }: { request: Request }) => {
    try {
      const { user, headers } = await requireRole(role, request, options);
      
      return {
        user: {
          id: user.properties.id,
          email: user.properties.email,
          isValidated: user.properties.isValidated,
          isAdmin: user.properties.isAdmin
        },
        headers
      };
    } catch (error) {
      if (error instanceof Response) {
        if (error.status === 401) {
          throw redirect("/auth/login");
        }
        throw error;
      }
      throw new Response("Authentication error", { status: 500 });
    }
  };
}

export function createAuthAction(
  role: AuthRole,
  options: AuthOptions = {}
) {
  return (handler: (args: { request: Request; user: any; headers: Headers | null }) => Promise<any>) => {
    return async ({ request }: { request: Request }) => {
      try {
        const { user, headers } = await requireRole(role, request, options);
        
        const userData = {
          id: user.properties.id,
          email: user.properties.email,
          isValidated: user.properties.isValidated,
          isAdmin: user.properties.isAdmin
        };
        
        return await handler({ request, user: userData, headers });
      } catch (error) {
        if (error instanceof Response) {
          if (error.status === 401) {
            throw redirect("/auth/login");
          }
          throw error;
        }
        throw new Response("Authentication error", { status: 500 });
      }
    };
  };
} 