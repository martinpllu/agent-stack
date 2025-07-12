import { redirect } from "react-router"
import { clearTokens } from "./auth-server"

export async function logoutAction() {
  const headers = clearTokens()
  throw redirect("/", { headers })
} 