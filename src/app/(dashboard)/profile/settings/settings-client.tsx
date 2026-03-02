'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Camera,
  Loader2,
  ArrowLeft,
  Trash2,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/longbox/user-avatar';
import { updateUserProfile, updateUserPreferences, changePassword } from '@/actions/auth';

interface ProfileSettingsClientProps {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    displayName: string | null;
    bio: string | null;
    defaultReadMode: string | null;
    autoScroll: boolean | null;
    defaultBrightness: number | null;
    theme: string | null;
    gridSize: string | null;
    createdAt: Date | null;
  };
}

export function ProfileSettingsClient({ profile }: ProfileSettingsClientProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [name, setName] = useState(profile.name || '');
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.image);

  // Preferences state
  const [readMode, setReadMode] = useState(profile.defaultReadMode || 'standard');
  const [autoScroll, setAutoScroll] = useState(profile.autoScroll || false);
  const [brightness, setBrightness] = useState(profile.defaultBrightness || 100);
  const [theme, setTheme] = useState(profile.theme || 'dark');
  const [gridSize, setGridSize] = useState(profile.gridSize || 'medium');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Loading states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  // Success/error states
  const [profileSaved, setProfileSaved] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  const handleAvatarDelete = async () => {
    if (!avatarUrl) return;
    if (!confirm('Are you sure you want to remove your profile picture?')) return;

    setIsDeletingAvatar(true);
    try {
      const response = await fetch('/api/avatar/upload', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setAvatarUrl(null);
        await updateSession();
        router.refresh();
      } else {
        alert(result.error || 'Failed to delete avatar');
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      alert('Failed to delete avatar');
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSaved(false);
    try {
      const result = await updateUserProfile(profile.id, {
        name,
        displayName,
        bio,
      });

      if (result.success) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    setPreferencesSaved(false);
    try {
      const result = await updateUserPreferences(profile.id, {
        defaultReadMode: readMode,
        autoScroll,
        defaultBrightness: brightness,
        theme,
        gridSize,
      });

      if (result.success) {
        setPreferencesSaved(true);
        setTimeout(() => setPreferencesSaved(false), 3000);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      alert('Failed to update preferences');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await changePassword(profile.id, currentPassword, newPassword);

      if (result.success) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      setPasswordError('Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-8">
          {/* Profile Picture Section */}
          <section className="bg-card rounded border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Profile Picture</h2>
            <div className="flex items-start gap-6">
              <div className="relative group">
                <UserAvatar
                  src={avatarUrl}
                  alt="Profile"
                  size="2xl"
                  className="w-32 h-32 border-2 border-border"
                />
                {(isUploadingAvatar || isDeletingAvatar) && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-full">
                    <Loader2 className="w-6 h-6 text-foreground animate-spin" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload a picture to personalize your profile. Images should be square and at least 256x256 pixels.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    variant="outline"
                    size="sm"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {avatarUrl ? 'Change' : 'Upload'}
                  </Button>
                  {avatarUrl && (
                    <Button
                      onClick={handleAvatarDelete}
                      disabled={isDeletingAvatar}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/30"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Public Profile Section */}
          <section className="bg-card rounded border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Public Profile</h2>
              {profileSaved && (
                <span className="flex items-center gap-1 text-sm text-primary/70">
                  <Check className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your real name (optional)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Choose a display name"
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    How others will see you
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="bg-secondary border-border min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/500 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={profile.email || ''}
                  disabled
                  className="bg-muted border-border text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* Reading Preferences Section */}
          <section className="bg-card rounded border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Reading Preferences</h2>
              {preferencesSaved && (
                <span className="flex items-center gap-1 text-sm text-primary/70">
                  <Check className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Read Mode</Label>
                  <Select value={readMode} onValueChange={setReadMode}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (Left to Right)</SelectItem>
                      <SelectItem value="rtl">Right to Left (Manga)</SelectItem>
                      <SelectItem value="webtoon">Webtoon (Vertical Scroll)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How comics are displayed by default
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Grid Size</Label>
                  <Select value={gridSize} onValueChange={setGridSize}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Size of comic covers in grids
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Default Brightness</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-secondary rounded appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">{brightness}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default brightness for the reader
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded">
                <div>
                  <Label className="text-foreground">Auto-Scroll</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically scroll through pages in webtoon mode
                  </p>
                </div>
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    autoScroll ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-foreground rounded-full transition-transform ${
                      autoScroll ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Application color theme
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSavePreferences}
                  disabled={isSavingPreferences}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSavingPreferences ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* Password Section */}
          <section className="bg-card rounded border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>
            <div className="space-y-4">
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded text-primary/70 text-sm">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  Password changed successfully
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-secondary border-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="bg-secondary border-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                  variant="outline"
                  className="border-border"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-card rounded border border-destructive/20 p-6">
            <h2 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h2>
            <div className="flex items-center justify-between p-4 bg-muted rounded">
              <div>
                <p className="text-foreground font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/30 hover:bg-destructive/10"
                onClick={() => alert('Account deletion is not yet implemented')}
              >
                Delete Account
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
