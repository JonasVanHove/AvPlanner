import type { ReactNode } from 'react';
import '@/styles/buddy-battle.css';

interface BuddyLayoutProps {
  children: ReactNode;
}

export default function BuddyLayout({ children }: BuddyLayoutProps) {
  return children;
}