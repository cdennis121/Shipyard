import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  // Check if any users exist
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    console.log('No users found. Creating admin user...');
    
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        role: 'admin',
      },
    });

    console.log(`Admin user created: ${admin.username}`);
  } else {
    console.log('Users already exist. Skipping admin user creation.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
