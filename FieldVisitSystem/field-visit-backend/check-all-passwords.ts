import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany();
    const passwords = ['password', 'password123', 'admin', 'admin123', '1234'];
    for (const user of users) {
        let found = false;
        for (const pw of passwords) {
            if (await bcrypt.compare(pw, user.passwordHash)) {
                console.log(`LOGIN:${user.email}:${pw}:${user.role}`);
                found = true;
                break;
            }
        }
        if (!found) console.log(`LOGIN:${user.email}:UNKNOWN:${user.role}`);
    }
}
main().finally(() => prisma.$disconnect());
