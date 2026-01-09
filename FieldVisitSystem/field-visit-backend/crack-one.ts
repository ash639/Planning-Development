import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { email: 'one@example.com' } });
    if (!user) {
        console.log('User not found');
        return;
    }

    const commonPasswords = ['password', 'password123', 'admin', 'admin123', '1234', '123456', 'one123', 'one@123'];

    for (const pw of commonPasswords) {
        const match = await bcrypt.compare(pw, user.passwordHash);
        if (match) {
            console.log(`MATCH_FOUND:${pw}`);
            return;
        }
    }
    console.log('NO_MATCH_FOUND');
}

main().finally(() => prisma.$disconnect());
