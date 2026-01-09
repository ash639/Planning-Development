import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
    if (!u) return;
    const match = await bcrypt.compare('password123', u.passwordHash);
    console.log(`ADMIN_MATCH:${match}`);
}
main().finally(() => prisma.$disconnect());
