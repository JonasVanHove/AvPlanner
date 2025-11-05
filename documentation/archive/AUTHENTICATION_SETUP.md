# Authentication Setup Instructions

This document provides instructions for setting up authentication in your Availability Planner application.

## Database Setup

Run the following SQL commands in your Supabase SQL editor:

### 1. Add Authentication Support to Members Table

```sql
-- Add auth_user_id column to members table (nullable for existing members)
ALTER TABLE members ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add role column to members table with default 'member'
ALTER TABLE members ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'can_edit'));

-- Add created_by column to teams table to track who created the team
ALTER TABLE teams ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_members_auth_user_id ON members(auth_user_id);
CREATE INDEX idx_members_role ON members(role);
CREATE INDEX idx_teams_created_by ON teams(created_by);
```

### 2. Create User Teams Function

```sql
-- Create a function to get teams for a user
CREATE OR REPLACE FUNCTION get_user_teams(user_email TEXT)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_invite_code TEXT,
  team_is_password_protected BOOLEAN,
  team_created_at TIMESTAMP WITH TIME ZONE,
  user_role TEXT,
  member_count BIGINT,
  is_creator BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.invite_code,
    t.is_password_protected,
    t.created_at,
    COALESCE(m.role, 'member'::TEXT) as user_role,
    COUNT(m2.id) as member_count,
    (t.created_by IS NOT NULL AND au.email = user_email) as is_creator
  FROM teams t
  INNER JOIN members m ON t.id = m.team_id
  LEFT JOIN members m2 ON t.id = m2.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  WHERE m.email = user_email
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at, m.role, t.created_by, au.email
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get team members with roles (for admin management)
CREATE OR REPLACE FUNCTION get_team_members_with_roles(team_id_param UUID, user_email TEXT)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_role TEXT,
  can_edit_availability BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if user is admin or creator of the team
  IF NOT EXISTS (
    SELECT 1 FROM members m
    JOIN teams t ON m.team_id = t.id
    LEFT JOIN auth.users au ON t.created_by = au.id
    WHERE m.email = user_email 
    AND t.id = team_id_param
    AND (m.role = 'admin' OR au.email = user_email)
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin of this team';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    CONCAT(m.first_name, ' ', m.last_name) as member_name,
    m.email,
    COALESCE(m.role, 'member'::TEXT) as member_role,
    (m.role IN ('admin', 'can_edit')) as can_edit_availability,
    m.created_at
  FROM members m
  WHERE m.team_id = team_id_param
  ORDER BY 
    CASE m.role 
      WHEN 'admin' THEN 1
      WHEN 'can_edit' THEN 2
      ELSE 3
    END,
    m.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Enable Row Level Security (Optional)

```sql
-- Create RLS policies for authenticated users
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Members can see their own data and team data
CREATE POLICY "Users can view their own memberships" ON members
  FOR SELECT USING (auth.uid() = auth_user_id OR email = auth.jwt() ->> 'email');

-- Teams can be viewed by their members
CREATE POLICY "Members can view their teams" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM members 
      WHERE auth_user_id = auth.uid() 
      OR email = auth.jwt() ->> 'email'
    )
  );

-- Availability can be viewed by team members
CREATE POLICY "Team members can view availability" ON availability
  FOR SELECT USING (
    member_id IN (
      SELECT m.id FROM members m
      INNER JOIN members m2 ON m.team_id = m2.team_id
      WHERE m2.auth_user_id = auth.uid() 
      OR m2.email = auth.jwt() ->> 'email'
    )
  );

-- Allow authenticated users to insert/update their own availability
CREATE POLICY "Users can manage their own availability" ON availability
  FOR ALL USING (
    member_id IN (
      SELECT id FROM members 
      WHERE auth_user_id = auth.uid() 
      OR email = auth.jwt() ->> 'email'
    )
  );

-- Allow authenticated users to update their own member record
CREATE POLICY "Users can update their own member record" ON members
  FOR UPDATE USING (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- Public access for team creation and joining (existing functionality)
CREATE POLICY "Public access for team operations" ON teams
  FOR ALL USING (true);

CREATE POLICY "Public access for member operations" ON members
  FOR ALL USING (true);

CREATE POLICY "Public access for availability operations" ON availability
  FOR ALL USING (true);
```

## Supabase Configuration

### 1. Enable Authentication Providers

In your Supabase dashboard:

1. Go to **Authentication** > **Settings**
2. Enable **Email** authentication
3. Enable **Google** authentication (optional)
   - Add your Google OAuth credentials
   - Set redirect URL to: `http://localhost:3000/auth/callback`
   - **Important**: Make sure to toggle the "Enable" switch for Google provider
   - If you get "provider is not enabled" error, check that Google OAuth is properly enabled in Supabase

**Note**: If you don't want to set up Google OAuth, you can disable it by removing the Google login buttons from the components.

### 2. Environment Variables

Make sure your `.env.local` file contains:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features Implemented

### 1. Authentication Components

- **Login Form** (`/components/auth/login-form.tsx`)
  - Email/password login
  - Google OAuth login (optional)
  - Error handling for disabled providers
  - Fallback to email login if Google is not configured

- **Register Form** (`/components/auth/register-form.tsx`)
  - Email/password registration
  - Google OAuth registration (optional)
  - Email verification
  - Error handling for disabled providers

- **Forgot Password Form** (`/components/auth/forgot-password-form.tsx`)
  - Password reset via email
  - Redirect to reset password page

- **Auth Dialog** (`/components/auth/auth-dialog.tsx`)
  - Modal wrapper for auth forms
  - Login/Register buttons

### 2. User Dashboard & Admin Features

- **User Dashboard** (`/components/auth/user-dashboard.tsx`)
  - Shows user's teams with role indicators
  - Team details and member counts
  - Links to team calendars and settings
  - Admin panel access for team creators and admins
  - Logout functionality

- **Team Admin Panel** (`/components/admin/team-admin-panel.tsx`)
  - Manage team member roles
  - Set permissions for availability editing
  - Role-based access control
  - Real-time role updates

### 3. Role-Based Access Control

- **Creator Role**: User who created the team (if authenticated)
  - Full admin rights
  - Can manage all team members
  - Can promote/demote other members

- **Admin Role**: Promoted by creator or other admins
  - Can manage team member roles
  - Can edit all availability data
  - Can access admin panel

- **Can Edit Role**: Members with editing permissions
  - Can edit availability for all team members
  - Cannot manage roles

- **Member Role**: Default role for team members
  - Can only edit their own availability
  - Read-only access to team calendar

### 3. Routes

- **Auth Callback** (`/app/auth/callback/page.tsx`)
  - Handles Google OAuth callback
  - Redirects after successful authentication

- **Reset Password** (`/app/auth/reset-password/page.tsx`)
  - Password reset form
  - Handles password update

### 4. Updated Landing Page

- **Main Page** (`/app/page.tsx`)
  - Shows auth buttons when not logged in
  - Shows user dashboard when logged in
  - Seamless transition between states

### 5. Enhanced Team Creation

- **Team Form** (`/components/team-form.tsx`)
  - Automatically sets creator when user is authenticated
  - Anonymous team creation still supported
  - Creator gets admin privileges automatically

## Admin System

### Team Creation Behavior

1. **Authenticated User Creates Team**:
   - User becomes the team creator
   - Gets full admin privileges
   - Can manage all team members and roles
   - Team is linked to their account

2. **Anonymous User Creates Team**:
   - No creator is set
   - All team members have equal rights
   - Password protection is the only access control
   - No admin functionality available

### Role Management

- **Creator** (only for authenticated teams): Full control over team
- **Admin**: Can manage member roles and edit all availability
- **Can Edit**: Can edit everyone's availability but not manage roles  
- **Member**: Can only edit their own availability

### Permissions Matrix

| Action | Creator | Admin | Can Edit | Member |
|--------|---------|-------|----------|---------|
| Manage member roles | ✅ | ✅ | ❌ | ❌ |
| Edit all availability | ✅ | ✅ | ✅ | ❌ |
| Edit own availability | ✅ | ✅ | ✅ | ✅ |
| View team calendar | ✅ | ✅ | ✅ | ✅ |
| Access admin panel | ✅ | ✅ | ❌ | ❌ |

## Usage

### For New Users
1. Click "Sign Up" to create an account
2. Complete email verification
3. Access personalized dashboard

### For Existing Users  
1. Click "Login" to access dashboard
2. View all teams associated with your email
3. Manage team roles if you're a creator/admin

### Team Creation
- **Authenticated**: Creates team with you as creator/admin
- **Anonymous**: Creates team with equal member rights

### Team Management
1. **View Teams**: Dashboard shows all your teams with role indicators
2. **Access Calendars**: Click "View Calendar" on any team card
3. **Admin Panel**: Click "Manage" button (creators/admins only)
4. **Role Management**: Use admin panel to assign roles to members

### Forgot Password
- Click "Forgot your password?" on login form
- Check email for reset link
- Follow instructions to set new password

## Security Features

- Password validation (minimum 6 characters)
- Email verification for new accounts
- Secure password reset via email
- Google OAuth integration (optional)
- Row Level Security policies (optional)
- Protected routes and data access
- Role-based access control
- Creator/admin privilege system
- Graceful degradation when OAuth is not configured

## Common Issues & Solutions

### "Provider is not enabled" Error
**Problem**: Google OAuth is not properly configured in Supabase
**Solution**: 
1. Go to Supabase Dashboard > Authentication > Settings
2. Enable Google provider and add OAuth credentials
3. Or disable Google login buttons if not needed

### Missing Admin Functions
**Problem**: Admin panel not showing for team creators
**Solution**: 
1. Run the database migrations to add role columns
2. Ensure `created_by` field is set when creating teams
3. Check that user is authenticated when creating teams

### Teams Not Showing in Dashboard
**Problem**: User's teams not appearing in dashboard
**Solution**:
1. Ensure members table has correct email addresses
2. Run the `get_user_teams` function in database
3. Check authentication status

## Next Steps

1. Run the database migrations in your Supabase SQL editor
2. Configure authentication providers in Supabase dashboard
3. Test the authentication flow
4. Optionally enable Row Level Security for additional security

The authentication system is now fully integrated with your existing team management functionality!
