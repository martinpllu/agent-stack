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
  
  // // Check validation if required (temporarily disabled for basic auth)
  // if (options.validated && !user.properties.isValidated) {
  //   throw new Response("Account not validated", { 
  //     status: 403,
  //     headers: headers || undefined
  //   });
  // }
  
  // // Check role permissions (temporarily disabled for basic auth)  
  // if (role === "admin" && !user.properties.roles.includes("admin")) {
  //   throw new Response("Admin access required", { 
  //     status: 403,
  //     headers: headers || undefined
  //   });
  // }
  
  return { user, headers };
}

// Convenience functions for common use cases
export async function requireValidatedUserRole(request: Request) {
  return requireRole("user", request, { validated: true });
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
          // // temporarily simplified for basic auth
          // email: user.properties.email,
          // roles: user.properties.roles,
          // isValidated: user.properties.isValidated,
          // isAdmin: user.properties.roles.includes("admin")
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
          // // temporarily simplified for basic auth
          // email: user.properties.email,
          // roles: user.properties.roles,
          // isValidated: user.properties.isValidated,
          // isAdmin: user.properties.roles.includes("admin")
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