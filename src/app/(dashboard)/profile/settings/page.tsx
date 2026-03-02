import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/actions/auth';
import { ProfileSettingsClient } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    redirect('/login');
  }

  return <ProfileSettingsClient profile={profile} />;
}
