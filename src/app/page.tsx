import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <DashboardClient user={user} />;
}
