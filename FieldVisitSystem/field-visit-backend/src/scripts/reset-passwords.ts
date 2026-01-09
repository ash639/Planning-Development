
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Ensuring users exist with password: ${password}`);

    const usersToEnsure = [
        { email: 'admin1', name: 'Admin One', role: 'ADMIN' },
        { email: 'admi', name: 'Agent Admi', role: 'AGENT' },
        { email: 'admin@example.com', name: 'Super Admin', role: 'SUPER_ADMIN' }
    ];

    for (const u of usersToEnsure) {
        // Find existing to get ID if needed, or create
        const existing = await prisma.user.findUnique({ where: { email: u.email } });

        if (existing) {
            await prisma.user.update({
                where: { id: existing.id },
                data: { passwordHash: hashedPassword, isActive: true }
            });
            console.log(`Updated existing user: ${u.email}`);
        } else {
            // Need org for non-super admin?
            // Get first org or create one
            let orgId = null;
            if (u.role !== 'SUPER_ADMIN') {
                const org = await prisma.organization.findFirst();
                if (org) orgId = org.id;
                else {
                    const newOrg = await prisma.organization.create({ data: { name: 'Default Org' } });
                    orgId = newOrg.id;
                }
            }

            await prisma.user.create({
                data: {
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    passwordHash: hashedPassword,
                    organizationId: orgId,
                    isActive: true
                }
            });
            console.log(`Created new user: ${u.email}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
