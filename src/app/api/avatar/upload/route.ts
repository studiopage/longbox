import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Avatar storage directory
const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

// Ensure avatar directory exists
async function ensureAvatarDir() {
  try {
    await fs.access(AVATAR_DIR);
  } catch {
    await fs.mkdir(AVATAR_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Ensure avatar directory exists
    await ensureAvatarDir();

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image with sharp - resize and convert to webp
    const processedImage = await sharp(buffer)
      .resize(256, 256, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toBuffer();

    // Generate filename with user ID
    const filename = `${userId}.webp`;
    const filepath = path.join(AVATAR_DIR, filename);

    // Delete old avatar if exists (different extension)
    const oldExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    for (const ext of oldExtensions) {
      const oldPath = path.join(AVATAR_DIR, `${userId}.${ext}`);
      try {
        await fs.unlink(oldPath);
      } catch {
        // File doesn't exist, ignore
      }
    }

    // Save new avatar
    await fs.writeFile(filepath, processedImage);

    // Update user record with avatar URL
    const avatarUrl = `/avatars/${filename}?t=${Date.now()}`;
    await db
      .update(users)
      .set({ image: avatarUrl, updated_at: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete avatar file
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    for (const ext of extensions) {
      const avatarPath = path.join(AVATAR_DIR, `${userId}.${ext}`);
      try {
        await fs.unlink(avatarPath);
      } catch {
        // File doesn't exist, ignore
      }
    }

    // Update user record to remove avatar
    await db
      .update(users)
      .set({ image: null, updated_at: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete avatar' },
      { status: 500 }
    );
  }
}
