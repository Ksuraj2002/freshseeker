import { AuthPanel } from '@/components/auth-panel';
import { JobDashboard } from '@/components/job-dashboard';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col gap-8">
      <AuthPanel />
      <JobDashboard />
    </main>
  );
}
