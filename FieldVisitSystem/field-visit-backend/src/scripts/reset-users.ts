
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Find users by name or partial email based on your screenshot
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: 'Ashish' },
                { name: 'B' },
                { email: { contains: 'admin' } },
                { email: { contains: 'admi' } }
            ]
        },
        select: { id: true, email: true, name: true, role: true }
    });

    console.log('--- Current Users Found ---');
    console.table(users);

    if (users.length > 0) {
        // Reset passwords to 'password123'
        const hashedPassword = await bcrypt.hash('password123', 10);

        for (const user of users) {
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hashedPassword }
            });
            console.log(`Updated password for ${user.email} (${user.role}) to: password123`);
        }
    } else {
        console.log('No matching users found.');
    }
}

main()
    .then(async () => await prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
