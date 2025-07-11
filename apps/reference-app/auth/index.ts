import { handle } from "hono/aws-lambda"
import { issuer } from "@openauthjs/openauth"
import { CodeUI } from "@openauthjs/openauth/ui/code"
import { CodeProvider } from "@openauthjs/openauth/provider/code"
import { MemoryStorage } from "@openauthjs/openauth/storage/memory"
import { DynamoStorage } from "@openauthjs/openauth/storage/dynamo"
import { FileStorage } from "./file-storage"
import { subjects } from "./subjects"

// // Simple in-memory user store for demo purposes
// // In production, this would be a database
// const users = new Map<string, { id: string; email: string; password: string }>()

// // Pre-populate with a test user
// users.set("test@example.com", {
//   id: "test-123",
//   email: "test@example.com", 
//   password: "password123" // In production, this would be hashed
// })

// async function validatePassword(email: string, password: string): Promise<boolean> {
//   const user = users.get(email)
//   if (!user) return false
//   return user.password === password // In production, use bcrypt or similar
// }

// async function setPassword(email: string, password: string) {
//   const user = users.get(email)
//   if (user) {
//     user.password = password
//   }
// }

async function getUser(email: string) {
  // Get user from database and return user ID
  // For now, just return a hardcoded ID like the example
  return "123"
  
  // // Original complex user management code:
  // const user = users.get(email)
  // if (user) {
  //   return user.id
  // }
  // // Create new user
  // const newUser = {
  //   id: email.split('@')[0] + "-" + Date.now(),
  //   email,
  //   password: "" // Will be set during registration
  // }
  // users.set(email, newUser)
  // return newUser.id
}

// Use file storage for dev mode to fix the container persistence issue
console.log(`[Storage] Environment check - AWS_LAMBDA_FUNCTION_NAME: ${process.env.AWS_LAMBDA_FUNCTION_NAME}, SST_STAGE: ${process.env.SST_STAGE}, NODE_ENV: ${process.env.NODE_ENV}`)

// For now, always use FileStorage to test the fix
console.log(`[Storage] Using FileStorage for reliable dev mode persistence`)
const storage = FileStorage({
  dir: '/tmp/openauth-storage'
})
const storageInfo = 'FileStorage /tmp/openauth-storage'

// Use the storage directly - it now implements the correct StorageAdapter interface

const app = issuer({
  subjects,
  // Use FileStorage for dev mode reliability
  storage: storage,
  // Remove after setting custom domain
  allow: async () => true,
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (email, code) => {
          const timestamp = new Date().toISOString()
          // Fix: email might be an object, extract the actual email string
          const emailStr = typeof email === 'string' ? email : email.email || JSON.stringify(email)
          console.log(`[SendCode] *** VERIFICATION CODE FOR ${emailStr}: ${code} *** at ${timestamp}`)
          console.log(`[SendCode] Email type: ${typeof email}, value:`, email)
          console.log(`[SendCode] Storage: ${storageInfo}`)
          // Log the code instead of sending email
        },
      }),
    ),
  },
  success: async (ctx, value) => {
    console.log(`[Success] Provider: ${value.provider}, Claims:`, value.claims)
    if (value.provider === "code") {
      return ctx.subject("user", {
        id: await getUser(value.claims.email)
      })
    }
    throw new Error("Invalid provider")
  },
})

export const handler = handle(app)