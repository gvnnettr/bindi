import 'reflect-metadata';
import * as argon2 from 'argon2';
import { AppDataSource } from './data-source';
import { PackageEntity } from './entities/package.entity';
import { AdminUser } from './entities/admin-user.entity';

async function main() {
  await AppDataSource.initialize();
  const pkgRepo = AppDataSource.getRepository(PackageEntity);
  const adminRepo = AppDataSource.getRepository(AdminUser);

  const packages: Array<{ code: string; name: string; monthlyPrice: string }> = [
    { code: 'teklif', name: 'Teklif Paketi', monthlyPrice: '250.00' },
    { code: 'takip', name: 'Takip Paketi', monthlyPrice: '450.00' },
  ];
  for (const p of packages) {
    const existing = await pkgRepo.findOne({ where: { code: p.code } });
    if (!existing) {
      await pkgRepo.save(pkgRepo.create(p));
      console.log(`Seeded package: ${p.code}`);
    }
  }

  const email = process.env.ADMIN_EMAIL ?? 'admin@servis-platform.local';
  const password = process.env.ADMIN_PASSWORD ?? 'change-me';
  const existingAdmin = await adminRepo.findOne({ where: { email } });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash(password);
    await adminRepo.save(adminRepo.create({ email, passwordHash, role: 'admin' }));
    console.log(`Seeded admin: ${email}`);
  }

  await AppDataSource.destroy();
  console.log('Seed done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
