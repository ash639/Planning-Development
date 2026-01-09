import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const emails = ['admin@example.com', 'one@example.com', 'two@example.com'];
    const pws = ['password', 'password123', 'admin', 'admin123', '1234'];
    for (const email of emails) {
        const u = await prisma.user.findFirst({ where: { email } });
        if (!u) continue;
        for (const pw of pws) {
            if (await bcrypt.compare(pw, u.passwordHash)) {
                console.log(`${email}:${pw}`);
                break;
            }
        }
    }
}
main().finally(() => prisma.$disconnect());
