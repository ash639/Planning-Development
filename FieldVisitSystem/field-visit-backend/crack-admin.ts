import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
    if (!u) { console.log('Admin not found'); return; }
    const pws = ['password', 'password123', 'admin', 'admin123', '1234', 'super123'];
    for (const pw of pws) {
        if (await bcrypt.compare(pw, u.passwordHash)) {
            console.log(`admin@example.com:${pw}`);
            return;
        }
    }
    console.log('Admin password not found in list');
}
main().finally(() => prisma.$disconnect());
