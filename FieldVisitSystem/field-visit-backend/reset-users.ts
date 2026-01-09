
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Resetting Users...');

    // 1. Ensure Organization
    let org = await prisma.organization.findFirst({ where: { name: 'Field Ops Ltd' } });
    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: 'Field Ops Ltd',
                status: 'ACTIVE'
            }
        });
        console.log('Created Organization: Field Ops Ltd');
    } else {
        console.log('Found Organization:', org.id);
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. Admin User (Now SUPER ADMIN per request)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            passwordHash: hashedPassword,
            role: 'SUPER_ADMIN', // Changed to SUPER_ADMIN
            organizationId: null // Independent
        },
        create: {
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'SUPER_ADMIN',
            passwordHash: hashedPassword,
            organizationId: null
        }
    });
    console.log('Upserted Admin (as Super Admin): admin@example.com / password123');

    // 3. Agent User
    const agent = await prisma.user.upsert({
        where: { email: 'agent@example.com' },
        update: {
            passwordHash: hashedPassword,
            role: 'AGENT',
            organizationId: org.id
        },
        create: {
            email: 'agent@example.com',
            name: 'Agent Smith',
            role: 'AGENT',
            passwordHash: hashedPassword,
            organizationId: org.id
        }
    });
    console.log('Upserted Agent: agent@example.com / password123');

    // 4. Super Admin User
    const superAdmin = await prisma.user.upsert({
        where: { email: 'super@example.com' },
        update: {
            passwordHash: hashedPassword,
            role: 'SUPER_ADMIN',
            organizationId: null // Super Admin doesn't belong to one org initially
        },
        create: {
            email: 'super@example.com',
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            passwordHash: hashedPassword,
            organizationId: null
        }
    });
    console.log('Upserted Super Admin: super@example.com / password123');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
