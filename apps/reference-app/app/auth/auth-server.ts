import { Resource } from "sst"
import { AuthError } from "~/utils/error-handler"
import type { FlatUser } from "~/types/user"

// Get auth backend URL from SST resource
export const authBackendUrl = Resource.AuthFunction.url

export async function setTokens(access: string) {
  const headers = new Headers()
  
  headers.append(
    "Set-Cookie",
    `access_token=${access}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`
  )
  
  return headers
}

export function clearTokens() {
  const headers = new Headers()
  
  headers.append(
    "Set-Cookie",
    `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  )
  
  return headers
}

export function getTokensFromRequest(request: Request) {
  const cookieHeader = request.headers.get("Cookie")
  if (!cookieHeader) return { access: null }
  
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map(c => c.split("="))
  )
  
  return {
    access: cookies.access_token || null
  }
}

export async function verifyAuth(request: Request) {
  const tokens = getTokensFromRequest(request)
  
  if (!tokens.access) {
    return { user: null, headers: null }
  }

  try {
    // Decode our simple base64 token
    const decodedString = Buffer.from(tokens.access, 'base64').toString()
    const tokenData = JSON.parse(decodedString)
    
    // Check if token is expired
    if (tokenData.exp && Date.now() > tokenData.exp) {
      return { user: null, headers: clearTokens() }
    }
    
    // Create user object in the expected format
    const user = {
      type: "user" as const,
      properties: {
        id: tokenData.id,
        email: tokenData.email,
        isAdmin: tokenData.isAdmin,
        isValidated: tokenData.isValidated,
      }
    }

    return { user, headers: null }
  } catch (error) {
    console.error("Auth verification error:", error)
    return { user: null, headers: clearTokens() }
  }
}

export async function getCurrentUser(request: Request) {
  const { user } = await verifyAuth(request);
  return user;
}

export async function requireAuth(request: Request) {
  const { user, headers } = await verifyAuth(request);
  
  if (!user) {
    throw AuthError.unauthorized();
  }
  
  return { user, headers };
}

export async function requireValidatedUser(request: Request) {
  const { user, headers } = await requireAuth(request);
  
  if (!user.properties.isValidated) {
    throw AuthError.notValidated();
  }
  
  // Return flattened user object for consistent access patterns
  const flatUser: FlatUser = {
    id: user.properties.id,
    email: user.properties.email,
    isValidated: user.properties.isValidated,
    isAdmin: user.properties.isAdmin
  };
  
  return { user: flatUser, headers };
}

export async function requireAdmin(request: Request) {
  const { user, headers } = await requireAuth(request);
  
  if (!user.properties.isAdmin) {
    throw AuthError.adminRequired();
  }
  
  // Return flattened user object for consistent access patterns
  const flatUser: FlatUser = {
    id: user.properties.id,
    email: user.properties.email,
    isValidated: user.properties.isValidated,
    isAdmin: user.properties.isAdmin
  };
  
  return { user: flatUser, headers };
} 