import { Storage } from "@openauthjs/openauth/storage/storage"
import { promises as fs } from 'fs'
import { join } from 'path'

export function FileStorage(options: { dir: string }): Storage {
  const { dir } = options
  
  // Ensure directory exists
  fs.mkdir(dir, { recursive: true }).catch(() => {})
  
  const getFilePath = (key: string) => join(dir, `${key}.json`)
  
  return {
    async get(key: string) {
      try {
        const filePath = getFilePath(key)
        const data = await fs.readFile(filePath, 'utf-8')
        const { value, expires } = JSON.parse(data)
        
        // Check if expired
        if (expires && new Date(expires) < new Date()) {
          await fs.unlink(filePath).catch(() => {})
          return undefined
        }
        
        console.log(`[FileStorage] Retrieved key ${key}`)
        return value
      } catch (error) {
        console.log(`[FileStorage] Key ${key} not found`)
        return undefined
      }
    },
    
    async set(key: string, value: any, ttl?: number) {
      const filePath = getFilePath(key)
      const data = {
        value,
        expires: ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null
      }
      
      await fs.writeFile(filePath, JSON.stringify(data))
      console.log(`[FileStorage] Stored key ${key} with ttl ${ttl}`)
    },
    
    async delete(key: string) {
      try {
        await fs.unlink(getFilePath(key))
        console.log(`[FileStorage] Deleted key ${key}`)
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
  }
}