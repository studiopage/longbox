import { db } from './index';
import { appSettings } from './schema';

async function seedDefaultSettings() {
  console.log('🌱 Seeding default app settings...');

  try {
    // Seed the default library path
    await db.insert(appSettings).values({
      key: 'library_path',
      value: '/comics',
      description: 'Root directory inside the container to scan for books'
    }).onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: '/comics',
        description: 'Root directory inside the container to scan for books',
        updated_at: new Date()
      }
    });

    console.log('✅ Default settings seeded.');
  } catch (error) {
    console.error('❌ Failed to seed settings:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedDefaultSettings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { seedDefaultSettings };

