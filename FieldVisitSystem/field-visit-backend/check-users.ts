
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('Users found:', users.map(u => ({ email: u.email, role: u.role, passwordHash: u.passwordHash.substring(0, 10) + '...' })));

    // Verify password for admin
    const admin = users.find(u => u.email === 'admin@example.com');
    if (admin) {
        const isMatch = await bcrypt.compare('password', admin.passwordHash);
        console.log(`Password 'password' matches for admin: ${isMatch}`);
    }

    // Verify password for agent
    const agent = users.find(u => u.email === 'agent@example.com');
    if (agent) {
        const isMatch = await bcrypt.compare('password', agent.passwordHash);
        console.log(`Password 'password' matches for agent: ${isMatch}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
