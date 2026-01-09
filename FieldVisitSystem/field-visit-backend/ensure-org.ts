
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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
    console.log(`Org ID: ${org.id}`);

    const email = 'agent@example.com';
    const password = 'password';
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
        console.log('Creating default Agent...');
        await prisma.user.create({
            data: {
                name: 'Agent User',
                email,
                passwordHash: hash,
                role: 'AGENT',
                organizationId: org.id
            }
        });
    } else {
        console.log('Resetting password for Agent...');
        await prisma.user.update({
            where: { email },
            data: { passwordHash: hash }
        });
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => await prisma.$disconnect());
