
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, role: true, name: true }
    });
    console.log('--- USER CREDENTIALS ---');
    users.forEach(u => {
        console.log(`Role: ${u.role.padEnd(12)} | Name: ${u.name.padEnd(15)} | Email: ${u.email}`);
    });
    console.log('------------------------');
    console.log('Default Password: password123 (for all users)');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
