import type { Page, TestInfo } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

/**
 * Captures comprehensive debug information when a test fails
 * This includes screenshots, DOM content, visible text, and interactive elements
 */
export async function captureDebugInfo(page: Page, testInfo: TestInfo) {
  // Only capture for failed tests
  if (testInfo.status !== testInfo.expectedStatus) {
    const testName = testInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugDir = path.join('test-results', 'debug', `${testName}_${timestamp}`);
    
    // Create debug directory
    if (!existsSync(debugDir)) {
      mkdirSync(debugDir, { recursive: true });
    }
    
    try {
      // 1. Take full page screenshot
      const screenshotPath = path.join(debugDir, 'screenshot.png');
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
      
      // 2. Save complete DOM
      const dom = await page.content();
      const domPath = path.join(debugDir, 'dom.html');
      writeFileSync(domPath, dom);
      console.log(`📄 DOM saved: ${domPath}`);
      
      // 3. Capture all visible text
      const visibleText = await page.evaluate(() => {
        return document.body.innerText || '';
      });
      const textPath = path.join(debugDir, 'visible-text.txt');
      writeFileSync(textPath, visibleText);
      console.log(`📝 Visible text saved: ${textPath}`);
      
      // 4. Capture current URL and title
      const pageInfo = {
        url: page.url(),
        title: await page.title(),
        timestamp: new Date().toISOString()
      };
      const infoPath = path.join(debugDir, 'page-info.json');
      writeFileSync(infoPath, JSON.stringify(pageInfo, null, 2));
      
      // 5. Capture all interactive elements
      const elements = await page.evaluate(() => {
        const selectors = [
          'button',
          'a',
          'input',
          'select',
          'textarea',
          '[role="button"]',
          '[role="link"]',
          '[data-testid]'
        ];
        
        const allElements = selectors.flatMap(sel => 
          Array.from(document.querySelectorAll(sel))
        );
        
        // Remove duplicates
        const uniqueElements = Array.from(new Set(allElements));
        
        return uniqueElements.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim().substring(0, 100),
            value: (el as HTMLInputElement).value,
            placeholder: (el as HTMLInputElement).placeholder,
            href: (el as HTMLAnchorElement).href,
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            testId: el.getAttribute('data-testid'),
            id: el.id,
            classes: el.className,
            name: (el as HTMLInputElement).name,
            type: (el as HTMLInputElement).type,
            disabled: (el as HTMLButtonElement).disabled,
            visible: rect.width > 0 && rect.height > 0,
            position: {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
        }).filter(el => el.visible); // Only include visible elements
      });
      
      const elementsPath = path.join(debugDir, 'interactive-elements.json');
      writeFileSync(elementsPath, JSON.stringify(elements, null, 2));
      console.log(`🔘 Found ${elements.length} interactive elements`);
      
      // 6. Log summary to console for immediate visibility
      console.log('\n' + '='.repeat(80));
      console.log('🚨 TEST FAILURE DEBUG INFO');
      console.log('='.repeat(80));
      console.log(`Test: ${testInfo.title}`);
      console.log(`URL: ${pageInfo.url}`);
      console.log(`Title: ${pageInfo.title}`);
      console.log(`Debug files saved to: ${debugDir}`);
      
      // Log interactive elements summary
      console.log('\n📊 Interactive Elements Summary:');
      const elementTypes = elements.reduce((acc: Record<string, number>, el) => {
        acc[el.tag] = (acc[el.tag] || 0) + 1;
        return acc;
      }, {});
      console.table(elementTypes);
      
      // Log buttons and links for quick reference
      console.log('\n🔵 Buttons:');
      elements
        .filter(el => el.tag === 'button' || el.role === 'button')
        .forEach(btn => {
          console.log(`  - "${btn.text}" ${btn.disabled ? '(disabled)' : ''} ${btn.testId ? `[data-testid="${btn.testId}"]` : ''}`);
        });
        
      console.log('\n🔗 Links:');
      elements
        .filter(el => el.tag === 'a' || el.role === 'link')
        .forEach(link => {
          console.log(`  - "${link.text}" -> ${link.href}`);
        });
        
      console.log('\n📝 Input Fields:');
      elements
        .filter(el => ['input', 'textarea', 'select'].includes(el.tag))
        .forEach(input => {
          console.log(`  - ${input.type || input.tag} [name="${input.name}"] ${input.placeholder ? `placeholder="${input.placeholder}"` : ''} value="${input.value || ''}"`);
        });
      
      console.log('='.repeat(80) + '\n');
      
      // 7. If there's an error message on the page, highlight it
      const errorMessages = await page.evaluate(() => {
        const errorSelectors = [
          '[role="alert"]',
          '.error',
          '.alert-error',
          '.text-red-500',
          '.text-red-600',
          '.text-danger'
        ];
        
        return errorSelectors.flatMap(sel => 
          Array.from(document.querySelectorAll(sel))
            .map(el => el.textContent?.trim())
            .filter(Boolean)
        );
      });
      
      if (errorMessages.length > 0) {
        console.log('❌ Error messages found on page:');
        errorMessages.forEach(msg => console.log(`  - ${msg}`));
        console.log('');
      }
      
    } catch (error) {
      console.error('Failed to capture debug info:', error);
    }
  }
}

/**
 * Sets up automatic debug capture for all tests in a file
 */
export function setupDebugCapture() {
  // This would be imported and called in test files
  return {
    afterEach: async ({ page }: { page: Page }, testInfo: TestInfo) => {
      await captureDebugInfo(page, testInfo);
    }
  };
}