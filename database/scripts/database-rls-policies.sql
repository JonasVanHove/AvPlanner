-- Row Level Security Policies for AvPlanner
-- These policies control access to the database tables

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Teams table policies
CREATE POLICY "Users can view teams they are members of" ON public.teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.team_id = teams.id 
            AND m.auth_user_id = auth.uid()
            AND m.status = 'active'
        )
    );

CREATE POLICY "Users can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Team admins can update their teams" ON public.teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.team_id = teams.id 
            AND m.auth_user_id = auth.uid()
            AND m.role IN ('admin', 'can_edit')
            AND m.status = 'active'
        )
    );

-- Members table policies
CREATE POLICY "Users can view members of teams they belong to" ON public.members
    FOR SELECT USING (
        auth.uid() = members.auth_user_id
        OR EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.team_id = members.team_id 
            AND m.auth_user_id = auth.uid()
            AND m.status = 'active'
        )
    );

CREATE POLICY "Users can insert members to teams they admin" ON public.members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.team_id = members.team_id 
            AND m.auth_user_id = auth.uid()
            AND m.role IN ('admin', 'can_edit')
            AND m.status = 'active'
        )
        OR auth.uid() = members.auth_user_id
    );

CREATE POLICY "Users can update their own member record or team admins can update" ON public.members
    FOR UPDATE USING (
        auth.uid() = members.auth_user_id
        OR EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.team_id = members.team_id 
            AND m.auth_user_id = auth.uid()
            AND m.role IN ('admin', 'can_edit')
            AND m.status = 'active'
        )
    );

-- Availability table policies
CREATE POLICY "Users can view availability for teams they belong to" ON public.availability
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m1
            JOIN public.members m2 ON m1.team_id = m2.team_id
            WHERE m2.id = availability.member_id
            AND m1.auth_user_id = auth.uid()
            AND m1.status = 'active'
        )
    );

CREATE POLICY "Users can insert availability for team members" ON public.availability
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members m1
            JOIN public.members m2 ON m1.team_id = m2.team_id
            WHERE m2.id = availability.member_id
            AND m1.auth_user_id = auth.uid()
            AND m1.status = 'active'
        )
    );

CREATE POLICY "Users can update availability for team members" ON public.availability
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.members m1
            JOIN public.members m2 ON m1.team_id = m2.team_id
            WHERE m2.id = availability.member_id
            AND m1.auth_user_id = auth.uid()
            AND m1.status = 'active'
        )
    );

CREATE POLICY "Users can delete availability for team members" ON public.availability
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.members m1
            JOIN public.members m2 ON m1.team_id = m2.team_id
            WHERE m2.id = availability.member_id
            AND m1.auth_user_id = auth.uid()
            AND m1.status = 'active'
        )
    );

-- Holidays table policies (read-only for most users)
CREATE POLICY "Anyone can view holidays" ON public.holidays
    FOR SELECT USING (true);

-- Countries table policies (read-only)
CREATE POLICY "Anyone can view countries" ON public.countries
    FOR SELECT USING (true);

-- Admin policies (for users with admin privileges)
CREATE POLICY "Admins can do anything on teams" ON public.teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members m
            JOIN auth.users u ON m.auth_user_id = u.id
            WHERE u.id = auth.uid()
            AND m.role = 'admin'
            AND m.status = 'active'
        )
        OR auth.jwt() ->> 'email' IN (
            'jonas@vanhove.be',
            'admin@avplanner.com',
            'jovanhove@gmail.com'
        )
    );

CREATE POLICY "Admins can do anything on members" ON public.members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members m
            JOIN auth.users u ON m.auth_user_id = u.id
            WHERE u.id = auth.uid()
            AND m.role = 'admin'
            AND m.status = 'active'
        )
        OR auth.jwt() ->> 'email' IN (
            'jonas@vanhove.be',
            'admin@avplanner.com',
            'jovanhove@gmail.com'
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.teams TO authenticated;
GRANT ALL ON public.members TO authenticated;
GRANT ALL ON public.availability TO authenticated;
GRANT SELECT ON public.holidays TO authenticated;
GRANT SELECT ON public.countries TO authenticated;

-- Grant some permissions to anonymous users for public access
GRANT SELECT ON public.countries TO anon;
GRANT SELECT ON public.holidays TO anon;