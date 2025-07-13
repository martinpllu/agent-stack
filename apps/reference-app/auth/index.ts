import { handle } from "hono/aws-lambda"
import { Hono } from "hono"
import { DynamoStorage } from "@openauthjs/openauth/storage/dynamo"
// Note: Using 'any' type for storage due to OpenAuth library type limitations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { FileStorage } from "./file-storage"
import { UserRepository } from "../app/db/repositories/user.repository"
import { AppError } from "../app/utils/error-handler"


// Use official SST environment detection to switch between storage types
const isDevMode = process.env.SST_DEV === 'true'

let storage: any
let storageInfo: string

if (isDevMode) {
  storage = FileStorage({
    dir: '/tmp/openauth-storage'
  })
  storageInfo = 'FileStorage /tmp/openauth-storage'
} else {
  const storageTable = process.env.OPENAUTH_STORAGE_TABLE!
  storage = DynamoStorage({
    table: storageTable,
  })
  storageInfo = `DynamoDB ${storageTable}`
}

// Custom sendCode function
async function sendCode(email: string, code: string) {
  // DEVELOPMENT ONLY: Console logging of verification codes for testing
  // TODO: Replace with actual email sending service for production
  // This is a deliberate measure to make testing easier without email infrastructure
  
  const timestamp = new Date().toISOString()
  console.log(`[SendCode] *** VERIFICATION CODE FOR ${email}: ${code} *** at ${timestamp}`)
}

// Create main Hono app with custom endpoints
const app = new Hono()

// Custom endpoint to send verification code
app.post('/code/send', async (c) => {
  try {
    const { email } = await c.req.json()
    
    if (!email) {
      return c.json({ message: 'Email is required' }, 400)
    }
    
    // Check if user exists and is validated
    const userRepo = new UserRepository()
    const user = await userRepo.findByEmail(email)
    
    if (!user) {
      console.error(`[Auth] Login attempt for non-existent user: ${email}`)
      return c.json({ message: 'User not found. Please contact an administrator.' }, 403)
    }
    
    if (!user.isValidated) {
      console.error(`[Auth] Login attempt for unvalidated user: ${email}`)
      return c.json({ message: 'Account not validated. Please contact an administrator.' }, 403)
    }
    
    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store the code in OpenAuth storage
    const key = ['code', email]
    await storage.set(key, { code, email, expires: Date.now() + 10 * 60 * 1000 }) // 10 minutes
    
    // Send the code
    await sendCode(email, code)
    
    // Log successful code issuance
    console.log(`[Auth] Verification code issued for validated user: ${email}`)
    
    return c.json({ message: 'Verification code sent' })
  } catch (error) {
    console.error('Send code error:', error)
    return c.json({ message: 'Failed to send verification code' }, 500)
  }
})

// Custom endpoint to verify code
app.post('/code/verify', async (c) => {
  try {
    const { email, code } = await c.req.json()
    
    if (!email || !code) {
      return c.json({ message: 'Email and code are required' }, 400)
    }
    
    // Retrieve stored code
    const key = ['code', email]
    const stored = await storage.get(key)
    
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      return c.json({ message: 'Invalid or expired verification code' }, 400)
    }
    
    // Clean up the stored code
    await storage.remove(key)
    
    // Find existing user (should already be validated since they got a code)
    const userRepo = new UserRepository()
    const user = await userRepo.findByEmail(email)
    
    if (!user) {
      console.error(`[Auth] Code verification attempted for non-existent user: ${email}`)
      return c.json({ message: 'User not found' }, 400)
    }
    
    await userRepo.updateLastLogin(user.id)
    
    // Generate access token (simplified - in production use proper JWT)
    const access_token = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      isValidated: user.isValidated,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    })).toString('base64')
    
    return c.json({ access_token })
  } catch (error) {
    console.error('Verify code error:', error)
    return c.json({ message: 'Failed to verify code' }, 500)
  }
})

export const handler = handle(app)