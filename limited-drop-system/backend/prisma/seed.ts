import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      password: hashedPassword,
      name: 'Alice',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      password: hashedPassword,
      name: 'Bob',
    },
  });

  // Create limited drop products
  const product1 = await prisma.product.upsert({
    where: { id: 'product-sneaker-001' },
    update: {},
    create: {
      id: 'product-sneaker-001',
      name: 'Limited Air Max Drop 2024',
      description: 'Exclusive limited edition sneakers – only 10 pairs available!',
      price: 299.99,
      stock: 10,
      totalStock: 10,
      imageUrl: 'https://via.placeholder.com/400x300?text=Limited+Drop',
    },
  });

  const product2 = await prisma.product.upsert({
    where: { id: 'product-hoodie-001' },
    update: {},
    create: {
      id: 'product-hoodie-001',
      name: 'Supreme Collab Hoodie',
      description: 'Collab drop – strictly limited to 5 units.',
      price: 199.99,
      stock: 5,
      totalStock: 5,
      imageUrl: 'https://via.placeholder.com/400x300?text=Hoodie+Drop',
    },
  });

  console.log('Seeded:', { user1: user1.email, user2: user2.email, product1: product1.name, product2: product2.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
