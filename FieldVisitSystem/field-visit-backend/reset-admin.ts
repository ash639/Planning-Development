
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    const password = 'password';
    const hash = await bcrypt.hash(password, 10);

    let org = await prisma.organization.findFirst();
    if (!org) {
        console.log('Creating default Org...');
        org = await prisma.organization.create({
            data: {
                name: 'Default Org',
                status: 'ACTIVE',
                plan: 'ENTERPRISE'
            }
        });
    }

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
        console.log('Creating Admin User...');
        await prisma.user.create({
            data: {
                name: 'Admin User',
                email,
                passwordHash: hash,
                role: 'ADMIN', // Ensuring Role is ADMIN
                organizationId: org.id
            }
        });
    } else {
        console.log('Resetting password for Admin...');
        await prisma.user.update({
            where: { email },
            data: {
                passwordHash: hash,
                role: 'ADMIN' // Ensure role is correct
            }
        });
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => await prisma.$disconnect());
