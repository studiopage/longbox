'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';

interface SignUpData {
  name: string;
  email: string;
  password: string;
}

interface SignUpResult {
  success: boolean;
  error?: string;
  userId?: string;
}

/**
 * Register a new user with email and password
 */
export async function signUp(data: SignUpData): Promise<SignUpResult> {
  try {
    const { name, email, password } = data;

    // Validate input
    if (!name || !email || !password) {
      return { success: false, error: 'All fields are required' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Check if email already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'user',
      })
      .returning({ id: users.id });

    return { success: true, userId: newUser.id };
  } catch (error) {
    console.error('[AUTH] Sign up error:', error);
    return { success: false, error: 'Failed to create account' };
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string) {
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        displayName: users.displayName,
        bio: users.bio,
        defaultReadMode: users.defaultReadMode,
        autoScroll: users.autoScroll,
        defaultBrightness: users.defaultBrightness,
        theme: users.theme,
        gridSize: users.gridSize,
        createdAt: users.created_at,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch (error) {
    console.error('[AUTH] Get profile error:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    displayName?: string;
    bio?: string;
    image?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(users)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error('[AUTH] Update profile error:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  data: {
    defaultReadMode?: string;
    autoScroll?: boolean;
    defaultBrightness?: number;
    theme?: string;
    gridSize?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(users)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error('[AUTH] Update preferences error:', error);
    return { success: false, error: 'Failed to update preferences' };
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const [user] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.password) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error('[AUTH] Change password error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}
