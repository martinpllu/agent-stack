import { readFile } from 'fs/promises';
import { resolve, join, basename } from 'path';
import { glob } from 'glob';
import { ReadDocsParams, ReadDocsResult, PageInfo } from '../types.js';

export class ReadDocsTool {
  private pagesDirectory: string;

  constructor(pagesDirectory: string = './pages') {
    this.pagesDirectory = resolve(pagesDirectory);
  }

  /**
   * Validates page names - only alphanumeric, hyphens, and underscores allowed
   */
  private isValidPageName(pageName: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(pageName);
  }

  /**
   * Gets list of available pages in the directory
   */
  private async getAvailablePages(): Promise<string[]> {
    try {
      const pattern = join(this.pagesDirectory, '*.md');
      const files = await glob(pattern);
      return files.map((file: string) => basename(file, '.md')).sort();
    } catch (error) {
      console.error('Error scanning pages directory:', error);
      return [];
    }
  }

  /**
   * Reads a single page file
   */
  private async readPageFile(pageName: string): Promise<PageInfo> {
    const filePath = join(this.pagesDirectory, `${pageName}.md`);
    
    try {
      const content = await readFile(filePath, 'utf-8');
      return {
        name: pageName,
        exists: true,
        content
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {
          name: pageName,
          exists: false,
          error: `Page '${pageName}' not found`
        };
      } else {
        return {
          name: pageName,
          exists: false,
          error: `Error reading page '${pageName}': ${(error as Error).message}`
        };
      }
    }
  }

  /**
   * Main read-docs tool function
   */
  async execute(params: ReadDocsParams): Promise<ReadDocsResult> {
    const pageNames = params.pages.split(',').map(name => name.trim());
    const result: ReadDocsResult = { pages: {} };
    const errors: string[] = [];

    // Validate page names
    for (const pageName of pageNames) {
      if (!this.isValidPageName(pageName)) {
        errors.push(`Invalid page name '${pageName}'. Only alphanumeric characters, hyphens, and underscores are allowed.`);
      }
    }

    if (errors.length > 0) {
      const availablePages = await this.getAvailablePages();
      throw new Error(`${errors.join(' ')} Available pages: ${availablePages.join(', ')}`);
    }

    // Read all requested pages
    const pageInfos = await Promise.all(
      pageNames.map(pageName => this.readPageFile(pageName))
    );

    const missingPages: string[] = [];
    
    for (const pageInfo of pageInfos) {
      if (pageInfo.exists && pageInfo.content !== undefined) {
        result.pages[pageInfo.name] = pageInfo.content;
      } else {
        missingPages.push(pageInfo.name);
        if (pageInfo.error) {
          errors.push(pageInfo.error);
        }
      }
    }

    // If there are missing pages, provide helpful error with available pages
    if (missingPages.length > 0) {
      const availablePages = await this.getAvailablePages();
      const errorMessage = `${errors.join(', ')}. Available pages: ${availablePages.join(', ')}`;
      throw new Error(errorMessage);
    }

    return result;
  }
} 