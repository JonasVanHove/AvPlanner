# 📱 AvPlanner - Responsive Design & Testing Documentation

## 🎯 Overview

This document describes the responsive design implementation and testing setup for the AvPlanner Next.js application. The app has been fully optimized for mobile devices while maintaining desktop functionality.

## 📋 Table of Contents

1. [Responsive Design Implementation](#responsive-design-implementation)
2. [Mobile Navigation](#mobile-navigation)
3. [Testing Setup](#testing-setup)
4. [Deployment](#deployment)
5. [Troubleshooting](#troubleshooting)

---

## 🎨 Responsive Design Implementation

### Design Principles

- **Mobile-first approach**: Priority given to mobile experience
- **Progressive enhancement**: Desktop features enhanced, not replaced
- **Touch-friendly interfaces**: Larger tap targets on mobile
- **Content hierarchy**: Most important information first on small screens
- **Performance optimization**: Conditional rendering for better mobile performance

### Breakpoints Used

```css
/* Tailwind CSS breakpoints */
sm: 640px   /* Small devices and up */
md: 768px   /* Medium devices and up */  
lg: 1024px  /* Large devices and up */
xl: 1280px  /* Extra large devices and up */
```

### Key Responsive Components

#### 1. Landing Page (`app/page.tsx`)
- **Mobile header**: Compressed with "AvPlanner" short title
- **Desktop header**: Full navigation with extended title
- **Responsive hero section**: Adapted text sizes and layouts

```tsx
// Mobile vs Desktop title example
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
  <span className="md:hidden">AvPlanner</span>
  <span className="hidden md:inline">Availability Planner</span>
</h1>
```

#### 2. My Teams Dashboard (`app/my-teams/page.tsx`)
- **Responsive headers**: Shorter titles on mobile
- **Flexible buttons**: Adaptive sizing for different screen sizes
- **Card grid**: Responsive team card layout

#### 3. Team Calendar (`components/availability-calendar-redesigned.tsx`)
- **Dual-view system**: 
  - Mobile: Card-based layout with member cards
  - Desktop: Traditional table grid
- **Smart hamburger menu**: All calendar options accessible on mobile
- **Responsive controls**: Compact switches and dropdowns

### Mobile-Specific Features

#### Card-Based Calendar Layout
```tsx
{/* Mobile View */}
<div className="block md:hidden">
  {visibleMembers.map((member) => (
    <div className="border-b p-4">
      {/* Member info + 2-column day grid */}
      <div className="grid grid-cols-2 gap-2">
        {week.days.map((date) => (
          <div className="flex items-center justify-between p-2 rounded-md">
            {/* Day info + status */}
          </div>
        ))}
      </div>
    </div>
  ))}
</div>
```

#### Hamburger Navigation
```tsx
{/* Mobile Navigation */}
<div className="md:hidden flex items-center gap-2">
  <HamburgerMenu title="Calendar Options">
    <HamburgerMenuItem>Week selector</HamburgerMenuItem>
    <HamburgerMenuItem>Analytics</HamburgerMenuItem>
    <HamburgerMenuItem>Settings</HamburgerMenuItem>
  </HamburgerMenu>
</div>
```

---

## 📱 Mobile Navigation

### HamburgerMenu Component

The `HamburgerMenu` component provides a responsive navigation solution:

**Features:**
- Slide-out sheet interface using Radix UI
- Touch-optimized button sizes
- Context-aware menu items
- Accessible ARIA attributes

**Usage:**
```tsx
import { HamburgerMenu, HamburgerMenuItem } from '@/components/ui/hamburger-menu'

<HamburgerMenu title="Menu Title">
  <HamburgerMenuItem onClick={handleAction}>
    Action Item
  </HamburgerMenuItem>
  <HamburgerMenuItem>
    <CustomComponent />
  </HamburgerMenuItem>
</HamburgerMenu>
```

### Responsive Patterns

#### Show/Hide Based on Screen Size
```tsx
{/* Desktop only */}
<div className="hidden md:flex">Desktop content</div>

{/* Mobile only */}
<div className="md:hidden">Mobile content</div>

{/* Responsive sizing */}
<button className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10">
```

#### Conditional Rendering
```tsx
const isMobile = useIsMobile()

return (
  <>
    {isMobile ? <MobileComponent /> : <DesktopComponent />}
  </>
)
```

---

## 🧪 Testing Setup

### Test Stack

- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright
- **Coverage**: Jest coverage reports
- **Visual Testing**: Playwright screenshots

### Unit Testing

#### Configuration Files
```javascript
// jest.config.js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }
}

module.exports = createJestConfig(customJestConfig)
```

#### Running Tests
```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

#### Example Unit Test
```tsx
// __tests__/utils.test.ts
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('combines class names correctly', () => {
    const result = cn('class1', 'class2')
    expect(result).toBe('class1 class2')
  })
})
```

### E2E Testing with Playwright

#### Configuration
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3001' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } }
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3001'
  }
})
```

#### Running E2E Tests
```bash
# Run all e2e tests
pnpm test:e2e

# Interactive UI mode
pnpm test:e2e:ui

# Specific browser
npx playwright test --project=chromium
```

#### Responsive Testing Example
```typescript
// e2e/responsive.spec.ts
test('should display correctly on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  
  // Check mobile-specific elements
  await expect(page.locator('.md\\:hidden')).toBeVisible()
  await expect(page).toHaveScreenshot('mobile-homepage.png')
})
```

---

## 🚀 Deployment

### Build Process

1. **Development**
   ```bash
   pnpm run dev      # Start development server
   ```

2. **Testing**
   ```bash
   pnpm test         # Run unit tests
   pnpm test:e2e     # Run e2e tests
   ```

3. **Building**
   ```bash
   pnpm run build   # Build for production
   pnpm run start   # Start production server
   ```

### Environment Setup

Required environment variables:
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Production Considerations

- **Image optimization**: Next.js automatic image optimization
- **Static generation**: Pre-built pages where possible
- **Mobile performance**: Lazy loading and code splitting
- **PWA features**: Can be added with next-pwa

---

## 🔧 Troubleshooting

### Common Issues

#### Mobile Menu Not Showing
```tsx
// Check if HamburgerMenu is properly imported
import { HamburgerMenu } from '@/components/ui/hamburger-menu'

// Ensure mobile breakpoint classes are correct
<div className="md:hidden"> {/* Shows on mobile only */}
```

#### Layout Overflow on Mobile
```css
/* Ensure content doesn't overflow horizontally */
.container {
  @apply w-full max-w-none px-4 sm:px-6 lg:px-8;
}
```

#### Test Failures
```bash
# Clear Jest cache
npx jest --clearCache

# Update Playwright browsers
npx playwright install

# Debug failing tests
npx playwright test --debug
```

### Performance Tips

1. **Use responsive images**
   ```tsx
   <Image 
     src="/image.jpg" 
     width={800} 
     height={600}
     className="w-full h-auto"
     priority // For above-fold images
   />
   ```

2. **Optimize mobile interactions**
   ```tsx
   <button className="min-h-[44px] min-w-[44px]"> {/* Touch target */}
   ```

3. **Conditional component loading**
   ```tsx
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     ssr: false // Client-side only for mobile
   })
   ```

---

## 📈 Key Metrics

### Responsive Breakpoints Covered
- ✅ Mobile: 320px - 767px
- ✅ Tablet: 768px - 1023px  
- ✅ Desktop: 1024px+

### Test Coverage Goals
- Unit tests: 80%+ coverage
- E2E tests: Critical user journeys
- Responsive tests: All major components

### Performance Targets
- Mobile: < 3s First Contentful Paint
- Desktop: < 2s First Contentful Paint
- Accessibility: WCAG 2.1 AA compliance

---

## 🎉 Success Criteria

The AvPlanner app now features:

✅ **Complete mobile responsiveness**  
✅ **Preserved desktop functionality**  
✅ **Modern navigation patterns**  
✅ **Comprehensive test coverage**  
✅ **Touch-optimized interactions**  
✅ **Ctrl+click functionality for power users**  
✅ **Scalable component architecture**

---

*This documentation covers the responsive design implementation and testing setup for AvPlanner. For technical support or feature requests, please refer to the development team.*