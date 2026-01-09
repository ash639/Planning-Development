import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany();
    const passwords = ['password', 'password123', 'admin', 'admin123', '1234'];
    let out = '';
    for (const user of users) {
        let found = false;
        for (const pw of passwords) {
            if (await bcrypt.compare(pw, user.passwordHash)) {
                out += `${user.email}:${pw}:${user.role}\n`;
                found = true;
                break;
            }
        }
        if (!found) out += `${user.email}:UNTRIED:${user.role}\n`;
    }
    fs.writeFileSync('creds.txt', out);
}
main().finally(() => prisma.$disconnect());
