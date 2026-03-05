# AvPlanner - Comprehensive Test Guide

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

## Test Structure

Tests are organized by feature in the `__tests__/` directory:

```
__tests__/
├── auth/                              # Authentication tests
│   ├── login.test.ts
│   ├── logout.test.ts
│   └── session.test.ts
├── availability-calendar.test.tsx     # Main calendar functionality
├── availability-dropdown.test.tsx     # Status selector
├── badges.test.ts                     # Badge system
├── hamburger-menu.test.tsx            # Mobile menu
├── holiday-country-linking.test.ts    # Holiday management
├── notifications.test.ts              # All notification types
├── theme-restriction.test.tsx         # Theme switching
├── team-management.test.ts            # Team operations
├── mobile.test.tsx                    # Responsive design
├── performance.test.ts                # Performance metrics
└── utils.test.ts                      # Utility functions
```

## Key Test Files

### 1. Availability Calendar Tests

```typescript
describe('AvailabilityCalendarRedesigned', () => {
  it('should render calendar with correct dates', () => {
    // Test calendar initialization
  })

  it('should update availability on status change', () => {
    // Test status update
  })

  it('should support keyboard shortcuts', () => {
    // Test J, K, N, P, T, G, S keys
  })

  it('should trigger confetti on week complete', () => {
    // Test confetti trigger
  })

  it('should broadcast week_complete event', () => {
    // Test Realtime broadcast
  })

  it('should handle password-protected teams', () => {
    // Test password validation
  })

  it('should support undo/redo operations', () => {
    // Test Ctrl+Z, Ctrl+Y
  })
})
```

### 2. Badge Tests

```typescript
describe('Badge System', () => {
  it('should award timely_completion badge', () => {
    // Test badge awarding
  })

  it('should not duplicate badges', () => {
    // Test uniqueness constraint
  })

  it('should track activity count correctly', () => {
    // Test activity badge thresholds
  })

  it('should persist badges to database', () => {
    // Test db insertion
  })

  it('should show badge notifications', () => {
    // Test notification display
  })
})
```

### 3. Team Management Tests

```typescript
describe('Team Management', () => {
  it('should create team with invite code', () => {
    // Test team creation
  })

  it('should allow joining via invite code', () => {
    // Test team joining
  })

  it('should support password protection', () => {
    // Test password validation
  })

  it('should manage member roles', () => {
    // Test role-based access
  })

  it('should handle member visibility', () => {
    // Test visibility toggles
  })
})
```

### 4. Notification Tests

```typescript
describe('Notifications', () => {
  it('should send browser notification', () => {
    // Test notification API
  })

  it('should broadcast via Realtime', () => {
    // Test Supabase broadcast
  })

  it('should generate email digest', () => {
    // Test email generation
  })

  it('should support Teams webhook', () => {
    // Test webhook sending
  })

  it('should respect user preferences', () => {
    // Test notification settings
  })
})
```

### 5. Theme Tests

```typescript
describe('Themes', () => {
  it('should apply light theme', () => {
    // Test light theme styles
  })

  it('should apply dark theme', () => {
    // Test dark theme styles
  })

  it('should support system theme', () => {
    // Test device preference
  })

  it('should persist theme selection', () => {
    // Test localStorage
  })

  it('should show buttons in blackwhite theme', () => {
    // Test button visibility
  })
})
```

### 6. Mobile & Responsive Tests

```typescript
describe('Mobile & Responsive', () => {
  it('should show hamburger menu on mobile', () => {
    // Test mobile breakpoint
  })

  it('should handle swipe gestures', () => {
    // Test touch events
  })

  it('should resize for small screens', () => {
    // Test responsive layout
  })

  it('should display on tablets', () => {
    // Test tablet layout
  })
})
```

### 7. Internationalization Tests

```typescript
describe('i18n - Internationalization', () => {
  it('should translate to Dutch', () => {
    // Test NL translations
  })

  it('should translate to French', () => {
    // Test FR translations
  })

  it('should format dates by locale', () => {
    // Test date formatting
  })

  it('should persist locale preference', () => {
    // Test locale storage
  })
})
```

### 8. Gamification Tests

```typescript
describe('Buddy Battle - Gamification', () => {
  it('should create buddy with stats', () => {
    // Test buddy creation
  })

  it('should execute battles correctly', () => {
    // Test battle logic
  })

  it('should level up properly', () => {
    // Test leveling system
  })

  it('should manage inventory', () => {
    // Test item management
  })

  it('should track quests', () => {
    // Test quest progress
  })

  it('should award achievements', () => {
    // Test achievement logic
  })
})
```

## Coverage Targets

- **Overall**: 80%+ code coverage
- **Critical Paths**: 100% (calendar, badges, notifications)
- **Utility Functions**: 90%+ coverage
- **Components**: 75%+ coverage
- **API Routes**: 85%+ coverage
- **Hooks**: 90%+ coverage

## Running Specific Tests

```bash
# Run single test file
pnpm test availability-calendar

# Run tests matching pattern
pnpm test --testNamePattern="badge"

# Run only failed tests
pnpm test --onlyChanged

# Run with coverage for specific files
pnpm test:coverage -- src/components/AvailabilityCalendar.tsx
```

## Debugging Tests

```bash
# Run with verbose output
pnpm test -- --verbose

# Run single test
pnpm test -- --testNamePattern="specific test name"

# Debug in node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## E2E Testing with Playwright

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- availability.e2e.ts

# Run in headed mode (see browser)
pnpm test:e2e -- --headed

# Debug mode with inspector
pnpm test:e2e -- --debug
```

## Common Test Scenarios

### Testing Availability Updates

```typescript
test('should update availability', async () => {
  // 1. Render calendar
  // 2. Click on date cell
  // 3. Select new status
  // 4. Verify status icon
  // 5. Verify database updated
})
```

### Testing Badge Award Logic

```typescript
test('should award badge on eligible action', async () => {
  // 1. Create member with N activity dates
  // 2. Trigger badge check
  // 3. Verify badge inserted
  // 4. Verify notification sent
})
```

### Testing Team Notifications

```typescript
test('should broadcast week completion', async () => {
  // 1. Complete week as member A
  // 2. Verify Realtime broadcast sent
  // 3. Member B receives notification
  // 4. Confetti triggers
})
```

### Testing Theme Switching

```typescript
test('should apply theme without reload', async () => {
  // 1. Select new theme
  // 2. Verify CSS applied
  // 3. Verify localStorage updated
  // 4. Reload page
  // 5. Verify theme persisted
})
```

## Continuous Integration

Tests run automatically on:
- Pull requests to `main` branch
- Pushes to `main` branch
- Before deployment to production

Failing tests block deployment.

## Test Dependencies

- **Jest**: Testing framework
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **Supabase Test Utils**: Database testing
- **Mock Service Worker**: API mocking

## Best Practices

1. **Isolated Tests**: Each test should be independent
2. **Clear Names**: Test names should describe what they test
3. **Setup/Teardown**: Use beforeEach/afterEach appropriately
4. **Mocking**: Mock external dependencies (API, database)
5. **Assertions**: Use specific assertions, not general ones
6. **Performance**: Keep tests fast (< 5 seconds each)
7. **Accessibility**: Test keyboard navigation and screen readers

## Troubleshooting

### Test Timeouts
- Increase timeout: `jest.setTimeout(10000)`
- Check for missing awaits
- Verify mocks are working

### Database Connection Errors
- Use test database instead
- Mock Supabase in tests
- Use environment variables

### Component Not Rendering
- Check mock provider setup
- Verify fixtures/mocks are correct
- Use `screen.debug()` to inspect

## Resources

- Jest Documentation: https://jestjs.io/
- React Testing Library: https://testing-library.com/react
- Playwright Documentation: https://playwright.dev/
- Supabase Testing: https://supabase.com/docs

---

**Remember**: Good tests = Confident deployments! 🚀
