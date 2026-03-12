import { createPrismaAdapter } from '../src/lib/prisma-adapter';
import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
  const resetAdminPassword = process.env.RESET_ADMIN_PASSWORD_ON_SEED === 'true';

  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    console.log('Admin user not found. Creating admin user...');

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        role: 'admin',
      },
    });

    console.log(`Admin user created: ${admin.username}`);
    return;
  }

  if (!resetAdminPassword) {
    console.log('Admin user already exists. Skipping password reset.');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.update({
    where: { username: adminUsername },
    data: {
      passwordHash,
      role: 'admin',
    },
  });

  console.log(`Admin user updated: ${adminUsername}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
