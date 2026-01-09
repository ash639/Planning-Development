import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
    if (!u) return;
    const pws = ['password', 'password123', 'admin', 'admin123'];
    for (const pw of pws) {
        if (await bcrypt.compare(pw, u.passwordHash)) {
            console.log(`ADMIN_PW:${pw}`);
            return;
        }
    }
    console.log('ADMIN_PW:NOT_FOUND');
}
main().finally(() => prisma.$disconnect());
