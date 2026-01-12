import { Pool } from 'pg';
import { config } from 'dotenv';

// Load .env file
config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'vibecode',
  user: process.env.DB_USER || 'vibecode',
  password: process.env.DB_PASSWORD || 'vibecode',
});

interface User {
  id: string;
  username: string;
}

// Sample users data
const sampleUsers = [
  {
    github_id: 1001,
    username: 'vibecoder_alice',
    display_name: 'Alice Chen',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    bio: 'Full-stack developer | Coffee enthusiast | Building cool stuff',
  },
  {
    github_id: 1002,
    username: 'bob_the_builder',
    display_name: 'Bob Martinez',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    bio: 'DevOps engineer by day, indie hacker by night',
  },
  {
    github_id: 1003,
    username: 'charlie_codes',
    display_name: 'Charlie Wu',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
    bio: 'React Native developer | Open source contributor',
  },
  {
    github_id: 1004,
    username: 'diana_dev',
    display_name: 'Diana Johnson',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana',
    bio: 'Backend engineer @ startup | Rust evangelist',
  },
  {
    github_id: 1005,
    username: 'evan_engineer',
    display_name: 'Evan Park',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=evan',
    bio: 'ML engineer | Building AI-powered tools',
  },
];

// Sample vibe captions
const vibeCaptions = [
  'Crushing it today! Just deployed a new feature 🚀',
  'Deep in the zone. This codebase is speaking to me.',
  'Pair programming session was fire today',
  'Finally fixed that bug that haunted me for days',
  'New keyboard arrived. Productivity +100%',
  'Coffee + code = perfect morning',
  'Late night debugging session. Worth it!',
  'Code review day. Learning so much from the team.',
  'Shipped to production. Feels good!',
  'Refactoring legacy code. Send help 😅',
];

async function clearData(): Promise<void> {
  console.log('Clearing existing data...');
  await pool.query('DELETE FROM reactions');
  await pool.query('DELETE FROM vibes');
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM users');
}

async function seedUsers(): Promise<User[]> {
  console.log('Seeding users...');
  const users: User[] = [];

  for (const user of sampleUsers) {
    const result = await pool.query<User>(
      `INSERT INTO users (github_id, username, display_name, avatar_url, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username`,
      [user.github_id, user.username, user.display_name, user.avatar_url, user.bio]
    );
    const insertedUser = result.rows[0];
    if (insertedUser) {
      users.push(insertedUser);
    }
    console.log(`  ✓ Created user: ${user.username}`);
  }

  return users;
}

async function seedVibes(users: User[]): Promise<string[]> {
  console.log('\nSeeding vibes...');
  const vibeIds: string[] = [];
  const today = new Date();

  for (const user of users) {
    // Create vibes for the past 5-7 days randomly
    const daysToCreate = 3 + Math.floor(Math.random() * 5); // 3-7 days

    for (let i = 0; i < daysToCreate; i++) {
      const vibeDate = new Date(today);
      vibeDate.setDate(vibeDate.getDate() - i);
      const vibeDateStr = vibeDate.toISOString().split('T')[0];

      const caption = vibeCaptions[Math.floor(Math.random() * vibeCaptions.length)];
      const imageKey = `vibes/${user.id}/${vibeDateStr}.jpg`;
      const imageUrl = `https://picsum.photos/seed/${user.id}-${vibeDateStr}/800/600`;

      try {
        const result = await pool.query<{ id: string }>(
          `INSERT INTO vibes (user_id, image_url, image_key, caption, vibe_date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [user.id, imageUrl, imageKey, caption, vibeDateStr]
        );
        const insertedVibe = result.rows[0];
        if (insertedVibe) {
          vibeIds.push(insertedVibe.id);
        }
      } catch {
        // Skip if duplicate (unique constraint)
      }
    }
    console.log(`  ✓ Created vibes for: ${user.username}`);
  }

  return vibeIds;
}

async function seedReactions(users: User[], vibeIds: string[]): Promise<void> {
  console.log('\nSeeding reactions...');
  let reactionCount = 0;

  for (const vibeId of vibeIds) {
    // Each vibe gets 0-4 random reactions
    const numReactions = Math.floor(Math.random() * 5);
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numReactions && i < shuffledUsers.length; i++) {
      const reactingUser = shuffledUsers[i];
      if (!reactingUser) continue;
      try {
        await pool.query(
          `INSERT INTO reactions (vibe_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [vibeId, reactingUser.id]
        );
        reactionCount++;
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`  ✓ Created ${reactionCount} reactions`);
}

async function seed(): Promise<void> {
  console.log('Starting database seeding...\n');

  try {
    await clearData();
    const users = await seedUsers();
    const vibeIds = await seedVibes(users);
    await seedReactions(users, vibeIds);

    console.log('\n✓ Seeding completed successfully!');
    console.log(`  - ${users.length} users`);
    console.log(`  - ${vibeIds.length} vibes`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding if this file is executed directly
seed();

export { seed };
