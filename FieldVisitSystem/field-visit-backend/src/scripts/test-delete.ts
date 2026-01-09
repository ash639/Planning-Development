
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testDelete() {
    console.log('Creating dummy user...');
    try {
        const user = await prisma.user.create({
            data: {
                email: 'todelete@example.com',
                passwordHash: 'hash',
                name: 'To Delete',
                role: 'AGENT'
            }
        });
        console.log('User created:', user.id);

        console.log('Attempting delete...');
        await prisma.user.delete({ where: { id: user.id } });
        console.log('User deleted successfully via Prisma.');
    } catch (e) {
        console.error('Prisma Delete Failed:', e);
    }
}

testDelete()
    .then(() => prisma.$disconnect())
    .catch(() => prisma.$disconnect());
