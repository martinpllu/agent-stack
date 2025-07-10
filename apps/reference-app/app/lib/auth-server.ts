import { createClient } from "@openauthjs/openauth/client"
import { subjects } from "../../auth/subjects"

export const client = createClient({
  clientID: "reactrouter",
  issuer: "https://xw4qzlmtelruwwtetf6tvtmcu40hgpbn.lambda-url.eu-west-1.on.aws"
})

export async function setTokens(access: string, refresh: string) {
  const headers = new Headers()
  
  headers.append(
    "Set-Cookie",
    `access_token=${access}; HttpOnly; Path=/; Max-Age=34560000; SameSite=Lax`
  )
  headers.append(
    "Set-Cookie", 
    `refresh_token=${refresh}; HttpOnly; Path=/; Max-Age=34560000; SameSite=Lax`
  )
  
  return headers
}

export function clearTokens() {
  const headers = new Headers()
  
  headers.append(
    "Set-Cookie",
    `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  )
  headers.append(
    "Set-Cookie",
    `refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  )
  
  return headers
}

export function getTokensFromRequest(request: Request) {
  const cookieHeader = request.headers.get("Cookie")
  if (!cookieHeader) return { access: null, refresh: null }
  
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map(c => c.split("="))
  )
  
  return {
    access: cookies.access_token || null,
    refresh: cookies.refresh_token || null
  }
}

export async function verifyAuth(request: Request) {
  const tokens = getTokensFromRequest(request)
  
  if (!tokens.access) {
    return { user: null, headers: null }
  }

  try {
    const verified = await client.verify(subjects, tokens.access, {
      refresh: tokens.refresh || undefined,
    })

    if (verified.err) {
      return { user: null, headers: clearTokens() }
    }
    
    // If tokens were refreshed, return new headers
    let headers = null
    if (verified.tokens) {
      headers = await setTokens(verified.tokens.access, verified.tokens.refresh)
    }

    return { user: verified.subject, headers }
  } catch (error) {
    console.error("Auth verification error:", error)
    return { user: null, headers: clearTokens() }
  }
} 