import { redirect } from "react-router"
import { client, clearTokens } from "./auth-server"

export async function loginAction() {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  const host = process.env.NODE_ENV === "production" ? "your-production-domain.com" : "localhost:5173"
  const redirectUri = `${protocol}://${host}/auth/callback`
  
  try {
    const { url } = await client.authorize(redirectUri, "code")
    throw redirect(url)
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