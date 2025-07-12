import { redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { client, setTokens } from "~/auth/auth-server"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  
  if (!code) {
    console.error("No authorization code received")
    throw redirect("/?error=no_code")
  }
  
  const protocol = url.protocol.slice(0, -1) // Remove trailing ':'
  const host = url.host
  const redirectUri = `${protocol}://${host}/auth/callback`
  
  try {
    const exchanged = await client.exchange(code, redirectUri)
    
    if (exchanged.err) {
      console.error("Token exchange error:", exchanged.err)
      throw redirect("/?error=exchange_failed")
    }
    
    // Set cookies and redirect to home
    const headers = await setTokens(exchanged.tokens.access, exchanged.tokens.refresh)
    throw redirect("/", { headers })
    
  } catch (error) {
    if (error instanceof Response) {
      throw error // This is our redirect response
    }
    console.error("Auth callback error:", error)
    throw redirect("/?error=callback_failed")
  }
}

export default function AuthCallback() {
  // This component should never render since the loader always redirects
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg">Completing authentication...</p>
      </div>
    </div>
  )
} 