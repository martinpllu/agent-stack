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

// Use official SST environment detection to switch between storage types
const isDevMode = process.env.SST_DEV === 'true'
console.log(`[Storage] Environment check - SST_DEV: ${process.env.SST_DEV}, isDevMode: ${isDevMode}`)

let storage: any
let storageInfo: string

if (isDevMode) {
  console.log(`[Storage] Using FileStorage for SST dev mode`)
  storage = FileStorage({
    dir: '/tmp/openauth-storage'
  })
  storageInfo = 'FileStorage /tmp/openauth-storage'
} else {
  const storageTable = process.env.OPENAUTH_STORAGE_TABLE!
  console.log(`[Storage] Using DynamoDB for deployed environment: ${storageTable}`)
  storage = DynamoStorage({
    table: storageTable,
  })
  storageInfo = `DynamoDB ${storageTable}`
}

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