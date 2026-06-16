import { AuthPanel } from '@/components/auth-panel';
import { JobDashboard } from '@/components/job-dashboard';

export default function HomePage() {
  return (
    <main className="flex flex-col gap-8">
      <AuthPanel />
      <JobDashboard />
    </main>
  );
}
