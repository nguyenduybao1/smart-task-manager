'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import TaskBoard from '@/components/tasks/TaskBoard';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function DashboardPage() {
  const { isAuthenticated, user, logout, isLoggingOut } = useAuth();
  const router  = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  // Chờ client mount xong mới render — tránh hydration mismatch
  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              Smart Task Manager
            </span>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              Beta
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {user?.name ?? user?.email}
            </span>
            <button
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Overview
          </h2>
          <AnalyticsDashboard />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Tasks
          </h2>
          <TaskBoard />
        </section>
      </main>
    </div>
  );
}