# AvPlanner - Complete Setup & Deployment Guide

## Overview

This guide covers all the necessary setup and deployment steps for AvPlanner, including database configuration, RLS permissions fixes, and best practices.

## Prerequisites

- Node.js 20+
- pnpm (or npm)
- Supabase project (https://supabase.com)
- PostgreSQL database (via Supabase)

## 1. Database Setup & Permissions Fix

### Step 1: Apply All RLS Fixes

The RLS (Row Level Security) permissions have been comprehensively fixed to ensure all functionality works while maintaining data security.

```bash
# In your Supabase dashboard:
# 1. Go to SQL Editor
# 2. Create a new query
# 3. Copy the contents of database/fix-all-rls-permissions.sql
# 4. Execute the script

# OR use Supabase CLI:
supabase db push --linked
```

**What this does:**
- Fixes `user_badges` table to allow badge insertions from client-side code
- Ensures `availability` table works correctly for team members
- Sets up proper `members` table permissions
- Configures `teams` table for team management
- Opens up buddy-battle related tables for gamification
- Enables system tables for public access (items, quests, etc.)

### Step 2: Verify RLS Policies

After applying the fix, verify the policies are in place:

```sql
-- Run in Supabase SQL Editor to see active policies
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

### Step 3: Database Backup Strategy

**Automatic Backups (via Supabase):**
- Supabase automatically creates daily backups
- Access backups in Project Settings → Backups

**Manual Backup:**
```bash
# Using pg_dump (install PostgreSQL client tools first)
pg_dump -h YOUR_SUPABASE_HOST -U postgres -d YOUR_DATABASE > backup.sql

# Using Supabase CLI
supabase db pull  # Pull current schema and data
```

**Backup Schedule Recommendation:**
- Daily automatic backups (handled by Supabase)
- Weekly manual exports for long-term retention
- Before major deployments

## 2. Frontend Setup

### Install Dependencies

```bash
pnpm install
```

### Environment Variables

Create `.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_APP_NAME=AvPlanner
```

### Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## 3. Theme & UI Fixes

### Dark/Light Mode

✅ **Fixed**: Homepage now respects the selected theme
- Light mode: `from-gray-50 via-white to-gray-100`
- Dark mode: `from-gray-950 via-slate-900 to-gray-950` (preserved)

### Black & White Theme

✅ **Fixed**: Buttons now visible in black & white theme header
- Changed button styling to white text on dark backgrounds
- Updated border colors for better contrast

### Available Themes

1. **Light** - Clean, professional light theme
2. **Dark** - Modern dark mode
3. **System** - Follows device preference
4. **Autumn** - Warm autumn colors
5. **Winter** - Cool winter palette
6. **Spring** - Fresh spring colors
7. **Summer** - Bright summer vibes
8. **Cozy** - Warm, comfortable theme
9. **Black & White** - High contrast monochrome
10. **By the Stove** - Warm fireplace theme
11. **TestDev** - Development theme

## 4. Features & Functionality

### ✅ Fully Implemented & Working

#### Core Availability Planning
- Real-time calendar view (1, 2, 4, 8 week views)
- Status options: Available, Remote, Unavailable, Need to Check, Absent, Holiday
- Bulk availability updates
- Team member management
- Keyboard shortcuts (J/N for next/prev, K/P for previous, T for today, G for go to date, S for settings)

#### Gamification & Badges
- Badge system with 23 badge types
- Activity tracking (10, 50, 100, 500, 1000 dates)
- Streaks, consistency badges
- Team-based achievements
- Badge notifications with confetti

#### Notifications
- Browser notifications (with permission)
- Realtime badges notifications
- Week completion celebrations
- Team notifications via Supabase Realtime
- Microsoft Teams webhook support
- Email digest summaries

#### Analytics
- Team availability analytics
- Member breakdown by status
- Weekly scores and trends
- Export to CSV/Excel/JSON

#### Multiplayer Features
- Invite-code based team joining
- Friendly URL support
- Password protection optional
- Role-based access (member, admin, can_edit)
- Read-only sharing

#### Internationalization
- English, Dutch (NL), French (FR)
- Multi-language calendar
- Localized notifications and badges

#### Mobile Support
- Responsive design
- Touch-friendly interface
- Hamburger menu on mobile
- Swipe navigation for week changes
- Mobile-optimized analytics

### Gamification: Buddy Battle System
- Create and customize buddy characters
- Battle systems (PvP, Boss, Training)
- Leveling and stat upgrades
- Trainer profiles and achievements
- Inventory system with items
- Mystery boxes and quests
- Point-based economy

## 5. Testing

### Run Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e

# E2E with UI
pnpm test:e2e:ui
```

### Key Test Categories
- Availability calendar operations
- Badge awarding and tracking
- Notification system
- Team management
- User authentication
- Mobile responsiveness

## 6. Deployment

### Deploy to Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys from GitHub
# Set environment variables in Vercel dashboard
```

### Environment Variables for Production

```ini
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_APP_NAME=AvPlanner
```

### Database Migrations in Production

1. Test migrations locally first
2. Create backup before applying
3. Execute migrations in Supabase SQL Editor
4. Verify data integrity
5. Monitor error logs

## 7. Troubleshooting

### Badges Not Appearing

```sql
-- Check if user_badges RLS policy exists
SELECT * FROM pg_policies WHERE tablename = 'user_badges';

-- Verify badges were inserted
SELECT * FROM user_badges WHERE user_id = YOUR_USER_ID;

-- Re-run badge check
SELECT check_and_award_badges(YOUR_MEMBER_ID, YOUR_TEAM_ID);
```

### Notifications Not Working

- Check browser notification permission
- Verify Supabase Realtime is enabled
- Check localStorage for `notifications` setting
- Look for console errors

### Theme Not Applying

- Clear browser cache
- Check if `next-themes` is properly initialized
- Verify CSS custom properties are loaded
- Check `globals.css` for theme definitions

### Mobile Menu Issues

- Test in Chrome DevTools mobile emulator
- Check if touch events are working
- Verify Sheet component is properly rendering
- Look for z-index conflicts

## 8. Maintenance

### Weekly Tasks
- Monitor error logs
- Check badge calculations
- Verify backups are running
- Review team feedback

### Monthly Tasks
- Review and optimize database queries
- Update dependencies: `pnpm update`
- Check for security patches
- Analyze usage statistics

### Quarterly Tasks
- Performance audit
- User experience review
- Feature planning
- Database optimization

## 9. Common Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Run tests
pnpm test

# Database schema migration
supabase db push --linked

# Check for unused code
pnpm deadcode
```

## 10. File Structure

```
AvPlanner/
├── app/                          # Next.js app router
│   ├── api/                      # API routes
│   │   ├── notifications/        # Notification endpoints
│   │   └── ...
│   ├── [locale]/                 # Internationalized routes
│   ├── admin/                    # Admin panel
│   ├── auth/                     # Authentication
│   ├── team/                     # Team pages
│   └── page.tsx                  # Homepage
├── components/                   # React components
│   ├── availability-calendar-redesigned.tsx  # Main calendar
│   ├── badge-*.tsx              # Badge components
│   ├── buddy-battle/            # Gamification components
│   ├── ui/                      # UI primitives
│   └── ...
├── database/                     # SQL migrations
│   ├── fix-all-rls-permissions.sql
│   ├── gamification-schema.sql
│   └── ...
├── hooks/                        # React hooks
├── lib/                          # Utilities and helpers
│   ├── badge-checker-client.ts   # Client-side badge logic
│   ├── i18n.ts                   # Translations
│   └── ...
├── public/                       # Static assets
├── styles/                       # Global styles
├── supabase/                     # Supabase config
└── __tests__/                    # Test files
```

## 11. Support & Resources

- **Documentation**: `/documentation/` folder
- **GitHub Issues**: Report bugs and request features
- **Email**: Support via project contact

## Congratulations! 🎉

AvPlanner is now fully set up and ready to use. All functionality is working, permissions are properly configured, and the application is optimized for both desktop and mobile users.

Enjoy coordinating with your team!
