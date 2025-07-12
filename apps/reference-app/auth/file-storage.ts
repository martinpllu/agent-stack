import type { StorageAdapter } from "@openauthjs/openauth/storage/storage"
import { promises as fs } from 'fs'
import { join } from 'path'

export function FileStorage(options: { dir: string }): StorageAdapter {
  const { dir } = options
  
  // Ensure directory exists
  fs.mkdir(dir, { recursive: true }).catch(() => {})
  
  const getFilePath = (key: string[]) => join(dir, `${key.join('_')}.json`)
  
  return {
    async get(key: string[]) {
      try {
        const filePath = getFilePath(key)
        const data = await fs.readFile(filePath, 'utf-8')
        const { value, expires } = JSON.parse(data)
        
        // Check if expired
        if (expires && new Date(expires) < new Date()) {
          await fs.unlink(filePath).catch(() => {})
          return undefined
        }
        
        console.log(`[FileStorage] Retrieved key ${key.join('_')}`)
        return value
      } catch (error) {
        console.log(`[FileStorage] Key ${key.join('_')} not found`)
        return undefined
      }
    },
    
    async set(key: string[], value: unknown, expiry?: Date) {
      const filePath = getFilePath(key)
      const data = {
        value,
        expires: expiry ? expiry.toISOString() : null
      }
      
      await fs.writeFile(filePath, JSON.stringify(data))
      console.log(`[FileStorage] Stored key ${key.join('_')} with expiry ${expiry}`)
    },
    
    async remove(key: string[]) {
      try {
        await fs.unlink(getFilePath(key))
        console.log(`[FileStorage] Deleted key ${key.join('_')}`)
      } catch (error) {
        // Ignore if file doesn't exist
      }
    },
    
    async *scan(prefix: string[]) {
      try {
        const files = await fs.readdir(dir)
        const prefixStr = prefix.join('_')
        
        for (const file of files) {
          if (file.startsWith(prefixStr) && file.endsWith('.json')) {
            const keyStr = file.slice(0, -5) // Remove .json extension
            const key = keyStr.split('_')
            
            try {
              const filePath = join(dir, file)
              const data = await fs.readFile(filePath, 'utf-8')
              const { value, expires } = JSON.parse(data)
              
              // Check if expired
              if (expires && new Date(expires) < new Date()) {
                await fs.unlink(filePath).catch(() => {})
                continue
              }
              
              yield [key, value]
            } catch (error) {
              // Skip invalid files
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist or other error
      }
    }
  }
}