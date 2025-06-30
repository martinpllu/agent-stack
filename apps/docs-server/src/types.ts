/**
 * Type definitions for Agent Stack Docs Server
 */

export interface ReadDocsParams {
  pages: string;
}

export interface ReadDocsResult {
  pages: Record<string, string>;
}

export interface PageInfo {
  name: string;
  exists: boolean;
  content?: string;
  error?: string;
}

export interface ServerConfig {
  pagesDirectory: string;
  logLevel: string;
} 