import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { ReadDocsTool } from '../../src/tools/read-docs.js';
import { ReadDocsParams } from '../../src/types.js';
import path from 'path';

describe('ReadDocsTool', () => {
  let readDocsTool: ReadDocsTool;
  const testPagesDir = './tests/fixtures/pages';

  beforeEach(async () => {
    // Create test pages directory and sample files
    await mkdir(testPagesDir, { recursive: true });
    
    // Create test pages
    await writeFile(
      path.join(testPagesDir, 'intro.md'),
      '# Introduction\n\nThis is the intro page.\n\n## Table of Contents\n- intro\n- test-page'
    );
    
    await writeFile(
      path.join(testPagesDir, 'test-page.md'),
      '# Test Page\n\nThis is a test page with some content.'
    );
    
    await writeFile(
      path.join(testPagesDir, 'another-page.md'),
      '# Another Page\n\nAnother test page.'
    );

    readDocsTool = new ReadDocsTool(testPagesDir);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await rm(testPagesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Single Page Reading', () => {
    it('should read a single existing page', async () => {
      const params: ReadDocsParams = { pages: 'intro' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages).toHaveProperty('intro');
      expect(result.pages.intro).toContain('# Introduction');
      expect(result.pages.intro).toContain('This is the intro page');
    });

    it('should read test-page correctly', async () => {
      const params: ReadDocsParams = { pages: 'test-page' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages).toHaveProperty('test-page');
      expect(result.pages['test-page']).toContain('# Test Page');
    });
  });

  describe('Multiple Page Reading', () => {
    it('should read multiple pages at once', async () => {
      const params: ReadDocsParams = { pages: 'intro,test-page' };
      const result = await readDocsTool.execute(params);
      
      expect(Object.keys(result.pages)).toHaveLength(2);
      expect(result.pages).toHaveProperty('intro');
      expect(result.pages).toHaveProperty('test-page');
    });

    it('should handle pages with spaces in input', async () => {
      const params: ReadDocsParams = { pages: ' intro , test-page ' };
      const result = await readDocsTool.execute(params);
      
      expect(Object.keys(result.pages)).toHaveLength(2);
      expect(result.pages).toHaveProperty('intro');
      expect(result.pages).toHaveProperty('test-page');
    });

    it('should read all available pages', async () => {
      const params: ReadDocsParams = { pages: 'intro,test-page,another-page' };
      const result = await readDocsTool.execute(params);
      
      expect(Object.keys(result.pages)).toHaveLength(3);
      expect(result.pages).toHaveProperty('intro');
      expect(result.pages).toHaveProperty('test-page');
      expect(result.pages).toHaveProperty('another-page');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing pages', async () => {
      const params: ReadDocsParams = { pages: 'nonexistent' };
      
      await expect(readDocsTool.execute(params)).rejects.toThrow();
    });

    it('should provide available pages in error message', async () => {
      const params: ReadDocsParams = { pages: 'nonexistent' };
      
      try {
        await readDocsTool.execute(params);
      } catch (error) {
        expect(error.message).toContain('Available pages:');
        expect(error.message).toContain('another-page');
        expect(error.message).toContain('intro');
        expect(error.message).toContain('test-page');
      }
    });

    it('should handle mix of existing and missing pages', async () => {
      const params: ReadDocsParams = { pages: 'intro,nonexistent,test-page' };
      
      await expect(readDocsTool.execute(params)).rejects.toThrow();
    });
  });

  describe('Page Name Validation', () => {
    it('should accept valid page names', async () => {
      const params: ReadDocsParams = { pages: 'test-page' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages).toHaveProperty('test-page');
    });

    it('should accept page names with underscores', async () => {
      // Create a test page with underscores
      await writeFile(
        path.join(testPagesDir, 'test_page_underscore.md'),
        '# Test Page with Underscores'
      );
      
      const params: ReadDocsParams = { pages: 'test_page_underscore' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages).toHaveProperty('test_page_underscore');
    });

    it('should reject invalid page names with special characters', async () => {
      const params: ReadDocsParams = { pages: 'test@page' };
      
      await expect(readDocsTool.execute(params)).rejects.toThrow(/Invalid page name/);
    });

    it('should reject page names with spaces', async () => {
      const params: ReadDocsParams = { pages: 'test page' };
      
      await expect(readDocsTool.execute(params)).rejects.toThrow(/Invalid page name/);
    });

    it('should reject page names with dots', async () => {
      const params: ReadDocsParams = { pages: 'test.page' };
      
      await expect(readDocsTool.execute(params)).rejects.toThrow(/Invalid page name/);
    });
  });

  describe('Intro Page Detection', () => {
    it('should successfully read intro page', async () => {
      const params: ReadDocsParams = { pages: 'intro' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages.intro).toContain('Table of Contents');
    });

    it('should read intro page along with other pages', async () => {
      const params: ReadDocsParams = { pages: 'intro,test-page' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages.intro).toContain('Introduction');
      expect(result.pages['test-page']).toContain('Test Page');
    });
  });

  describe('File Reading Functionality', () => {
    it('should handle empty pages', async () => {
      await writeFile(path.join(testPagesDir, 'empty.md'), '');
      
      const params: ReadDocsParams = { pages: 'empty' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages).toHaveProperty('empty');
      expect(result.pages.empty).toBe('');
    });

    it('should preserve markdown formatting', async () => {
      const markdownContent = '# Title\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2';
      await writeFile(path.join(testPagesDir, 'formatted.md'), markdownContent);
      
      const params: ReadDocsParams = { pages: 'formatted' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages.formatted).toBe(markdownContent);
    });

    it('should handle large files', async () => {
      const largeContent = 'Large content\n'.repeat(1000);
      await writeFile(path.join(testPagesDir, 'large.md'), largeContent);
      
      const params: ReadDocsParams = { pages: 'large' };
      const result = await readDocsTool.execute(params);
      
      expect(result.pages.large).toContain('Large content');
      expect(result.pages.large.split('\n')).toHaveLength(1001); // 1000 lines + final newline
    });
  });

  describe('Directory Scanning', () => {
    it('should find all available pages in directory', async () => {
      // The beforeEach creates intro.md, test-page.md, and another-page.md
      const params: ReadDocsParams = { pages: 'nonexistent' };
      
      try {
        await readDocsTool.execute(params);
      } catch (error) {
        // Check that all created pages are listed in the error
        expect(error.message).toContain('another-page');
        expect(error.message).toContain('intro');
        expect(error.message).toContain('test-page');
      }
    });

    it('should handle directories with no markdown files', async () => {
      const emptyDir = './tests/fixtures/empty-pages';
      await mkdir(emptyDir, { recursive: true });
      
      const emptyDirTool = new ReadDocsTool(emptyDir);
      const params: ReadDocsParams = { pages: 'any' };
      
      try {
        await emptyDirTool.execute(params);
      } catch (error) {
        expect(error.message).toContain('Available pages:');
      }
      
      // Clean up
      await rm(emptyDir, { recursive: true, force: true });
    });
  });

  describe('Edge Cases', () => {
    it('should handle pages parameter with only commas', async () => {
      const params: ReadDocsParams = { pages: ',,,' };
      
      await expect(readDocsTool.execute(params)).rejects.toThrow();
    });

    it('should handle empty page names in list', async () => {
      const params: ReadDocsParams = { pages: 'intro,,test-page' };
      
      await expect(readDocsTool.execute(params)).rejects.toThrow(/Invalid page name/);
    });

    it('should handle single comma', async () => {
      const params: ReadDocsParams = { pages: ',' };
      
      await expect(readDocsTool.execute(params)).rejects.toThrow(/Invalid page name/);
    });
  });
}); 