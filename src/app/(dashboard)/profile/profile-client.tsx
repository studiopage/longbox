'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  User,
  Mail,
  Calendar,
  BookOpen,
  Heart,
  ListChecks,
  FolderOpen,
  Camera,
  Loader2,
  Edit,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/longbox/user-avatar';

interface ProfileClientProps {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    displayName: string | null;
    bio: string | null;
    createdAt: Date | null;
  };
  stats: {
    booksRead: number;
    collections: number;
    readingList: number;
    favoriteSeries: number;
    favoriteCharacters: number;
  };
}

export function ProfileClient({ profile, stats }: ProfileClientProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.image);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAvatarUrl(result.avatarUrl);
        await updateSession();
        router.refresh();
      } else {
        alert(result.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  const displayName = profile.displayName || profile.name || 'User';

  return (
    <div className="min-h-screen bg-background">
      {/* GitHub-style layout: sidebar + main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar - Profile Card */}
          <aside className="w-full md:w-80 flex-shrink-0">
            <div className="sticky top-8 space-y-4">
              {/* Avatar Section */}
              <div className="relative group">
                <div className="w-full aspect-square max-w-[296px] mx-auto rounded-full border-2 border-border overflow-hidden bg-card">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <User className="w-24 h-24" />
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-foreground animate-spin" />
                    </div>
                  )}
                </div>
                {/* Upload overlay on hover */}
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 max-w-[296px] mx-auto rounded-full bg-background/0 hover:bg-background/50 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-center text-foreground">
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Change photo</span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* Name and Username */}
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                {profile.name && profile.displayName && profile.name !== profile.displayName && (
                  <p className="text-xl text-muted-foreground font-light">{profile.name}</p>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-foreground text-sm leading-relaxed">{profile.bio}</p>
              )}

              {/* Edit Profile Button */}
              <Link href="/profile/settings">
                <Button variant="outline" className="w-full border-border hover:border-border">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit profile
                </Button>
              </Link>

              {/* Profile Meta Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {memberSince}</span>
                </div>
              </div>

              {/* Stats/Achievements */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Achievements
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.booksRead >= 10 && (
                    <AchievementBadge icon={BookOpen} label="Bookworm" color="text-primary/70" />
                  )}
                  {stats.booksRead >= 50 && (
                    <AchievementBadge icon={Star} label="Avid Reader" color="text-primary/50" />
                  )}
                  {stats.collections >= 5 && (
                    <AchievementBadge icon={FolderOpen} label="Collector" color="text-primary" />
                  )}
                  {stats.favoriteCharacters >= 10 && (
                    <AchievementBadge icon={Heart} label="Fan" color="text-destructive" />
                  )}
                  {stats.booksRead === 0 && stats.collections === 0 && (
                    <span className="text-sm text-muted-foreground">Start reading to earn badges!</span>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Stats Overview - GitHub contribution graph style */}
            <div className="bg-card rounded border border-border p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Reading Activity</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <StatCard
                  icon={BookOpen}
                  value={stats.booksRead}
                  label="Books Read"
                  color="text-primary/70"
                  bgColor="bg-primary/10"
                />
                <StatCard
                  icon={FolderOpen}
                  value={stats.collections}
                  label="Collections"
                  color="text-primary"
                  bgColor="bg-primary/10"
                />
                <StatCard
                  icon={ListChecks}
                  value={stats.readingList}
                  label="Reading List"
                  color="text-primary/50"
                  bgColor="bg-primary/10"
                />
                <StatCard
                  icon={Heart}
                  value={stats.favoriteSeries}
                  label="Fav Series"
                  color="text-destructive"
                  bgColor="bg-destructive/10"
                />
                <StatCard
                  icon={Heart}
                  value={stats.favoriteCharacters}
                  label="Fav Characters"
                  color="text-primary/80"
                  bgColor="bg-primary/10"
                />
              </div>
            </div>

            {/* Pinned/Featured Sections */}
            <div className="space-y-6">
              {/* Recent Activity Section */}
              <section className="bg-card rounded border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
                </div>
                <div className="p-6">
                  {stats.booksRead > 0 ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-sm">
                        You&apos;ve read {stats.booksRead} books so far. Keep it up!
                      </p>
                      <Link href="/library">
                        <Button variant="outline" size="sm">
                          View Library
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">No reading activity yet</p>
                      <Link href="/library">
                        <Button>Start Reading</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              {/* Collections Preview */}
              <section className="bg-card rounded border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Collections</h2>
                  <span className="text-sm text-muted-foreground">{stats.collections} total</span>
                </div>
                <div className="p-6">
                  {stats.collections > 0 ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-sm">
                        You have {stats.collections} collection{stats.collections !== 1 ? 's' : ''}.
                      </p>
                      <Link href="/collections">
                        <Button variant="outline" size="sm">
                          View Collections
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">No collections yet</p>
                      <Link href="/library">
                        <Button>Create Collection</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              {/* Reading List Preview */}
              <section className="bg-card rounded border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Reading List</h2>
                  <span className="text-sm text-muted-foreground">{stats.readingList} items</span>
                </div>
                <div className="p-6">
                  {stats.readingList > 0 ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-sm">
                        You have {stats.readingList} item{stats.readingList !== 1 ? 's' : ''} in your reading list.
                      </p>
                      <Link href="/reading-list">
                        <Button variant="outline" size="sm">
                          View Reading List
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ListChecks className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">Your reading list is empty</p>
                      <Link href="/browse">
                        <Button>Browse Comics</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="text-center">
      <div className={`w-12 h-12 ${bgColor} rounded flex items-center justify-center mx-auto mb-2`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function AchievementBadge({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-xs text-foreground">{label}</span>
    </div>
  );
}
