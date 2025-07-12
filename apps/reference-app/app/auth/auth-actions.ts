import { redirect } from "react-router"
import { client, clearTokens } from "./auth-server"

export async function loginAction(request: Request) {
  const url = new URL(request.url)
  const protocol = url.protocol.slice(0, -1) // Remove trailing ':'
  const host = url.host
  const redirectUri = `${protocol}://${host}/auth/callback`
  
  try {
    // Use code provider for email/code authentication
    const { url: authUrl } = await client.authorize(redirectUri, "code")
    throw redirect(authUrl)
  } catch (error) {
    if (error instanceof Response) {
      throw error // This is our redirect response
    }
    console.error("Login action error:", error)
    throw new Error("Failed to initiate login")
  }
}

export async function logoutAction() {
  const headers = clearTokens()
  throw redirect("/", { headers })
} 