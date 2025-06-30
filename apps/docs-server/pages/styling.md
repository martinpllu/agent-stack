# Styling Guide

This document provides CSS and styling guidelines for building modern, responsive web applications with Agent Stack.

## CSS Framework

Agent Stack recommends using Tailwind CSS for rapid development and consistent styling across components.

### Installation

```bash
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npx tailwindcss init
```

### Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

## Component Patterns

### Button Component

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  onClick 
}: ButtonProps) {
  const baseClasses = "font-medium rounded-lg focus:outline-none focus:ring-2";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
  };
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Card Component

```tsx
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
```

## Design System

### Color Palette

- **Primary**: Blue (#3b82f6) - Main actions, links
- **Secondary**: Gray (#6b7280) - Secondary actions, text
- **Success**: Green (#10b981) - Success states, confirmations
- **Warning**: Yellow (#f59e0b) - Warnings, cautions
- **Danger**: Red (#ef4444) - Errors, destructive actions

### Typography

```css
/* Headings */
.text-h1 { @apply text-4xl font-bold text-gray-900; }
.text-h2 { @apply text-3xl font-semibold text-gray-900; }
.text-h3 { @apply text-2xl font-semibold text-gray-900; }
.text-h4 { @apply text-xl font-medium text-gray-900; }

/* Body text */
.text-body { @apply text-base text-gray-700 leading-relaxed; }
.text-body-sm { @apply text-sm text-gray-600; }

/* Links */
.text-link { @apply text-blue-600 hover:text-blue-800 underline; }
```

### Spacing

Use consistent spacing scale based on 4px increments:
- `space-1` = 4px
- `space-2` = 8px
- `space-4` = 16px
- `space-6` = 24px
- `space-8` = 32px

## Responsive Design

### Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
```

### Layout Patterns

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Grid items */}
</div>

// Responsive flex
<div className="flex flex-col md:flex-row gap-4">
  {/* Flex items */}
</div>
```

## Best Practices

1. **Mobile First**: Design for mobile screens first, then enhance for larger screens
2. **Accessibility**: Ensure proper color contrast (4.5:1 minimum)
3. **Performance**: Use CSS-in-JS sparingly, prefer utility classes
4. **Consistency**: Stick to the design system values
5. **Testing**: Test on multiple devices and screen sizes 