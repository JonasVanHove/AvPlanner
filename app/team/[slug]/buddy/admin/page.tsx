// =====================================================
// BUDDY BATTLE - Admin Page Route
// /team/[slug]/buddy/admin
// =====================================================

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/buddy-battle/admin-dashboard';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import '@/styles/buddy-battle.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

// Loading component
function AdminLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading admin dashboard...</p>
      </div>
    </div>
  );
}

// Check admin access
async function checkAdmin(slug: string) {
  const supabase = await getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: member } = await supabase
    .from('members')
    .select('is_admin')
    .eq('team_id', slug)
    .eq('auth_user_id', user.id)
    .single();
  
  return member?.is_admin || false;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminPage({ params }: PageProps) {
  const { slug } = await params;
  const isAdmin = await checkAdmin(slug);
  
  if (!isAdmin) {
    redirect(`/team/${slug}/buddy`);
  }
  
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminDashboard />
    </Suspense>
  );
}

// Metadata
export function generateMetadata() {
  return {
    title: 'AvPlanner Buddy | Admin Dashboard',
    description: 'Manage and monitor your team\'s Buddy Battle system',
  };
}
