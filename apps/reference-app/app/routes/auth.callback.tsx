import { redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"

export async function loader({ request }: LoaderFunctionArgs) {
  // Since we're using custom login flow, redirect to login page
  throw redirect("/auth/login")
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