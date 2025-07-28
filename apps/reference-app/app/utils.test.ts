import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility function', () => {
  describe('Basic functionality', () => {
    it('should merge single class string', () => {
      const result = cn('text-red-500');
      expect(result).toBe('text-red-500');
    });

    it('should merge multiple class strings', () => {
      const result = cn('text-red-500', 'bg-blue-500', 'p-4');
      expect(result).toBe('text-red-500 bg-blue-500 p-4');
    });

    it('should handle empty strings', () => {
      const result = cn('text-red-500', '', 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle undefined values', () => {
      const result = cn('text-red-500', undefined, 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle null values', () => {
      const result = cn('text-red-500', null, 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle false values', () => {
      const result = cn('text-red-500', false, 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle zero values', () => {
      const result = cn('text-red-500', 0, 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });
  });

  describe('Conditional classes', () => {
    it('should handle conditional classes with && operator', () => {
      const isActive = true;
      const isDisabled = false;
      
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      );
      
      expect(result).toBe('base-class active-class');
    });

    it('should handle conditional classes with ternary operator', () => {
      const variant = 'primary';
      
      const result = cn(
        'base-class',
        variant === 'primary' ? 'text-blue-500' : 'text-gray-500'
      );
      
      expect(result).toBe('base-class text-blue-500');
    });
  });

  describe('Object syntax', () => {
    it('should handle object with boolean values', () => {
      const result = cn({
        'text-red-500': true,
        'bg-blue-500': true,
        'hidden': false,
      });
      
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle mixed arguments with objects', () => {
      const result = cn(
        'base-class',
        {
          'active': true,
          'disabled': false,
        },
        'additional-class'
      );
      
      expect(result).toBe('base-class active additional-class');
    });
  });

  describe('Array syntax', () => {
    it('should handle arrays of classes', () => {
      const result = cn(['text-red-500', 'bg-blue-500', 'p-4']);
      expect(result).toBe('text-red-500 bg-blue-500 p-4');
    });

    it('should handle nested arrays', () => {
      const result = cn('base', ['nested-1', ['nested-2', 'nested-3']]);
      expect(result).toBe('base nested-1 nested-2 nested-3');
    });

    it('should handle arrays with conditional values', () => {
      const isActive = true;
      const result = cn([
        'base',
        isActive && 'active',
        false && 'hidden',
      ]);
      
      expect(result).toBe('base active');
    });
  });

  describe('Tailwind class merging', () => {
    it('should merge conflicting color classes', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should merge conflicting spacing classes', () => {
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });

    it('should merge different spacing directions', () => {
      const result = cn('px-4', 'py-2', 'px-8');
      expect(result).toBe('py-2 px-8');
    });

    it('should preserve non-conflicting classes', () => {
      const result = cn('text-red-500 font-bold', 'text-blue-500 underline');
      expect(result).toBe('font-bold text-blue-500 underline');
    });

    it('should handle arbitrary values', () => {
      const result = cn('p-[10px]', 'p-[20px]');
      expect(result).toBe('p-[20px]');
    });

    it('should handle important modifier', () => {
      const result = cn('text-red-500', '!text-blue-500');
      // tailwind-merge doesn't automatically remove non-important when important is added
      expect(result).toBe('text-red-500 !text-blue-500');
    });

    it('should handle responsive prefixes', () => {
      const result = cn('md:p-4', 'md:p-8', 'lg:p-4');
      expect(result).toBe('md:p-8 lg:p-4');
    });

    it('should handle hover and other state prefixes', () => {
      const result = cn('hover:bg-red-500', 'hover:bg-blue-500', 'focus:bg-green-500');
      expect(result).toBe('hover:bg-blue-500 focus:bg-green-500');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle complex component styling', () => {
      const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium';
      const variantClasses = {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      };
      const sizeClasses = {
        sm: 'h-9 px-3',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8',
      };
      
      const variant = 'primary';
      const size = 'md';
      const isDisabled = false;
      
      const result = cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && 'opacity-50 pointer-events-none',
        'custom-class'
      );
      
      expect(result).toContain('inline-flex');
      expect(result).toContain('bg-primary');
      expect(result).toContain('h-10');
      expect(result).toContain('custom-class');
      expect(result).not.toContain('opacity-50');
    });

    it('should handle all falsy values correctly', () => {
      const result = cn(
        'base',
        false,
        null,
        undefined,
        0,
        NaN,
        '',
        'end'
      );
      
      expect(result).toBe('base end');
    });

    it('should deduplicate classes', () => {
      const result = cn('p-4 p-4 text-red-500 text-red-500');
      expect(result).toBe('p-4 text-red-500');
    });

    it('should handle whitespace correctly', () => {
      const result = cn('  text-red-500  ', '  bg-blue-500  ', '  p-4  ');
      expect(result).toBe('text-red-500 bg-blue-500 p-4');
    });

    it('should handle classes with special characters', () => {
      const result = cn(
        'before:content-[""]',
        'after:content-["→"]',
        '[&>*]:text-red-500'
      );
      
      expect(result).toContain('before:content-[""]');
      expect(result).toContain('after:content-["→"]');
      expect(result).toContain('[&>*]:text-red-500');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle single empty string', () => {
      const result = cn('');
      expect(result).toBe('');
    });

    it('should handle multiple empty strings', () => {
      const result = cn('', '', '');
      expect(result).toBe('');
    });

    it('should handle very long class strings', () => {
      const longClass = Array(100).fill('class').join(' ');
      const result = cn(longClass);
      expect(result.split(' ')).toHaveLength(100);
    });

    it('should maintain class order when no conflicts', () => {
      const result = cn('a-class', 'b-class', 'c-class');
      const classes = result.split(' ');
      
      expect(classes.indexOf('a-class')).toBeLessThan(classes.indexOf('b-class'));
      expect(classes.indexOf('b-class')).toBeLessThan(classes.indexOf('c-class'));
    });
  });
});