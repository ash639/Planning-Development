
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organization.findMany();
    console.log('Orgs:', orgs);

    const users = await prisma.user.findMany();
    console.log('Users:', users.map(u => ({ email: u.email, orgId: u.organizationId })));

    const locationsCount = await prisma.location.count();
    console.log('Total Locations:', locationsCount);

    const sampleLocation = await prisma.location.findFirst();
    console.log('Sample Location OrgId:', sampleLocation?.organizationId);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
