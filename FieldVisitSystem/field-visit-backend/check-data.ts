
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking database data...');

    const organizations = await prisma.organization.findMany();
    console.log(`Organizations: ${organizations.length}`);
    organizations.forEach(o => console.log(` - ${o.id} (${o.name})`));

    const users = await prisma.user.findMany();
    console.log(`Users: ${users.length}`);
    users.forEach(u => console.log(` - ${u.email} (${u.role}) Org: ${u.organizationId}`));

    const locations = await prisma.location.findMany();
    console.log(`Locations: ${locations.length}`);
    locations.forEach(l => console.log(` - ${l.name} (Org: ${l.organizationId})`));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
