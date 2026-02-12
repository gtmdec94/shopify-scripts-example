import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple hash for seed data — in production, use bcrypt
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // --- Admin User ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@b2b-platform.com' },
    update: {},
    create: {
      email: 'admin@b2b-platform.com',
      passwordHash: hashPassword('admin123'),
      role: UserRole.ADMIN,
      firstName: 'Platform',
      lastName: 'Admin',
      companyName: 'B2B Manufacturing Co.',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  Admin user: ${admin.email}`);

  // --- Factory Manager ---
  const factoryManager = await prisma.user.upsert({
    where: { email: 'factory@b2b-platform.com' },
    update: {},
    create: {
      email: 'factory@b2b-platform.com',
      passwordHash: hashPassword('factory123'),
      role: UserRole.FACTORY_MANAGER,
      firstName: 'Factory',
      lastName: 'Manager',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  Factory manager: ${factoryManager.email}`);

  // --- QC Inspector ---
  const qcInspector = await prisma.user.upsert({
    where: { email: 'qc@b2b-platform.com' },
    update: {},
    create: {
      email: 'qc@b2b-platform.com',
      passwordHash: hashPassword('qc12345'),
      role: UserRole.QC_INSPECTOR,
      firstName: 'Quality',
      lastName: 'Inspector',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  QC Inspector: ${qcInspector.email}`);

  // --- Test Reseller ---
  const reseller = await prisma.user.upsert({
    where: { email: 'reseller@example.com' },
    update: {},
    create: {
      email: 'reseller@example.com',
      passwordHash: hashPassword('reseller123'),
      role: UserRole.RESELLER,
      firstName: 'Test',
      lastName: 'Reseller',
      companyName: 'Demo Reseller Store',
      phone: '+91-9876543210',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  Reseller: ${reseller.email}`);

  // --- Reseller Wallet (with initial balance for testing) ---
  const wallet = await prisma.wallet.upsert({
    where: { userId: reseller.id },
    update: {},
    create: {
      userId: reseller.id,
      balance: 5000.0,
      currency: 'INR',
    },
  });

  // Seed a topup transaction for the wallet
  await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId: reseller.id,
      type: 'CREDIT_TOPUP',
      amount: 5000.0,
      balanceBefore: 0,
      balanceAfter: 5000.0,
      description: 'Initial test balance',
    },
  });
  console.log(`  Wallet: ₹${wallet.balance} for ${reseller.email}`);

  // --- Sample Products ---
  const product1 = await prisma.product.upsert({
    where: { manufacturerSku: 'MUG-WHITE-11OZ' },
    update: {},
    create: {
      manufacturerSku: 'MUG-WHITE-11OZ',
      title: 'Custom White Ceramic Mug - 11oz',
      description:
        'High-quality white ceramic mug. Upload your photo or design for full-wrap printing.',
      basePrice: 299.0,
      costPrice: 120.0,
      category: 'Mugs',
      images: JSON.stringify([
        'https://placeholder.com/mug-white-11oz-front.jpg',
        'https://placeholder.com/mug-white-11oz-back.jpg',
      ]),
      printConfigId: 'PRINT-MUG-FULLWRAP',
      customizationSchema: JSON.stringify({
        fields: [
          {
            type: 'file',
            name: 'Upload Your Photo',
            required: true,
            accept: 'image/*',
          },
          {
            type: 'text',
            name: 'Personalization Text',
            required: false,
            maxLength: 50,
          },
        ],
      }),
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: 'MUG-WHITE-11OZ-STD' },
    update: {},
    create: {
      productId: product1.id,
      sku: 'MUG-WHITE-11OZ-STD',
      title: 'Standard',
      options: JSON.stringify({ size: '11oz', color: 'White' }),
      price: 299.0,
      costPrice: 120.0,
      inventoryQty: 500,
    },
  });
  console.log(`  Product: ${product1.title}`);

  const product2 = await prisma.product.upsert({
    where: { manufacturerSku: 'TSHIRT-BLACK-POLY' },
    update: {},
    create: {
      manufacturerSku: 'TSHIRT-BLACK-POLY',
      title: 'Custom Polyester T-Shirt - Black',
      description: 'Sublimation-ready polyester t-shirt. Upload your design for all-over print.',
      basePrice: 499.0,
      costPrice: 200.0,
      category: 'Apparel',
      images: JSON.stringify(['https://placeholder.com/tshirt-black-front.jpg']),
      printConfigId: 'PRINT-TSHIRT-ALLOVER',
      customizationSchema: JSON.stringify({
        fields: [
          {
            type: 'file',
            name: 'Upload Your Design',
            required: true,
            accept: 'image/*',
          },
        ],
      }),
    },
  });

  const tshirtSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  for (const size of tshirtSizes) {
    await prisma.productVariant.upsert({
      where: { sku: `TSHIRT-BLACK-POLY-${size}` },
      update: {},
      create: {
        productId: product2.id,
        sku: `TSHIRT-BLACK-POLY-${size}`,
        title: `Size ${size}`,
        options: JSON.stringify({ size, color: 'Black' }),
        price: 499.0,
        costPrice: 200.0,
        inventoryQty: 100,
      },
    });
  }
  console.log(`  Product: ${product2.title} (${tshirtSizes.length} variants)`);

  const product3 = await prisma.product.upsert({
    where: { manufacturerSku: 'PHONECASE-IPHONE15' },
    update: {},
    create: {
      manufacturerSku: 'PHONECASE-IPHONE15',
      title: 'Custom iPhone 15 Phone Case',
      description: 'Hard-shell phone case with custom UV print.',
      basePrice: 399.0,
      costPrice: 150.0,
      category: 'Phone Cases',
      images: JSON.stringify(['https://placeholder.com/phonecase-iphone15.jpg']),
      printConfigId: 'PRINT-CASE-UV',
      customizationSchema: JSON.stringify({
        fields: [
          {
            type: 'file',
            name: 'Upload Your Photo',
            required: true,
            accept: 'image/*',
          },
          {
            type: 'text',
            name: 'Name on Case',
            required: false,
            maxLength: 20,
          },
        ],
      }),
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: 'PHONECASE-IPHONE15-CLR' },
    update: {},
    create: {
      productId: product3.id,
      sku: 'PHONECASE-IPHONE15-CLR',
      title: 'Clear',
      options: JSON.stringify({ model: 'iPhone 15', style: 'Clear' }),
      price: 399.0,
      costPrice: 150.0,
      inventoryQty: 200,
    },
  });
  console.log(`  Product: ${product3.title}`);

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
