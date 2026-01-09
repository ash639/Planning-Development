import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany();
    console.log('---START---');
    for (const user of users) {
        console.log(`U:${user.email}:${user.role}`);
    }
    console.log('---END---');
}
main().finally(() => prisma.$disconnect());
