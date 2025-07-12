import { handle } from "hono/aws-lambda"
import { issuer } from "@openauthjs/openauth"
import { CodeUI } from "@openauthjs/openauth/ui/code"
import { CodeProvider } from "@openauthjs/openauth/provider/code"
import { DynamoStorage } from "@openauthjs/openauth/storage/dynamo"
// Note: Using 'any' type for storage due to OpenAuth library type limitations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { FileStorage } from "./file-storage"
import { subjects } from "./subjects"
import { UserRepository } from "../app/db/repositories/user.repository"
import { AppError } from "../app/utils/error-handler"


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
          // DEVELOPMENT ONLY: Console logging of verification codes for testing
          // TODO: Replace with actual email sending service for production
          // This is a deliberate measure to make testing easier without email infrastructure
          
          if (!isDevMode) {
            throw AppError.serverError("Console logging of verification codes is not allowed in production. Please implement proper email sending service.")
          }
          
          const timestamp = new Date().toISOString()
          // Fix: email might be an object, extract the actual email string
          const emailStr = typeof email === 'string' ? email : email.email || JSON.stringify(email)
          console.log(`[SendCode] *** VERIFICATION CODE FOR ${emailStr}: ${code} *** at ${timestamp}`)
          console.log(`[SendCode] Email type: ${typeof email}, value:`, email)
          console.log(`[SendCode] Storage: ${storageInfo}`)
          // Log the code instead of sending email for development/testing purposes
        },
      }),
    ),
  },
  success: async (ctx, value) => {
    console.log(`[Success] Provider: ${value.provider}, Claims:`, value.claims)
    if (value.provider === "code") {
      try {
        const userRepo = new UserRepository()
        
        // Find or create user in the database
        const user = await userRepo.findOrCreate(value.claims.email)
        
        // Update last login timestamp
        await userRepo.updateLastLogin(user.id)
        
        console.log(`[Auth] User authenticated: ${user.email} (ID: ${user.id})`)
        
        return ctx.subject("user", {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          isValidated: user.isValidated,
        })
      } catch (error) {
        console.error(`[Auth] Database error for email ${value.claims.email}:`, error)
        throw AppError.serverError("Failed to authenticate user")
      }
    }
    throw AppError.badRequest("Invalid provider")
  },
})

export const handler = handle(app)