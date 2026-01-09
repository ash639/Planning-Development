
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding locations...');

    const org = await prisma.organization.findFirst();
    if (!org) {
        console.log('No organization found. Creating one...');
        // Create Org logic if needed, but assuming one exists from previous steps
        return;
    }
    console.log(`Using Organization: ${org.id}`);

    // clear locations? No, just add if 0
    const count = await prisma.location.count();
    if (count > 0) {
        console.log(`Already have ${count} locations.`);
        return;
    }

    const locations = [
        { name: 'Bagha-II Station', latitude: 27.1, longitude: 84.1, address: 'West Champaran, Bagha-II' },
        { name: 'Ramnagar Hub', latitude: 27.2, longitude: 84.2, address: 'West Champaran, Ramnagar' },
        { name: 'Gaunaha Center', latitude: 27.3, longitude: 84.3, address: 'West Champaran, Gaunaha' },
        { name: 'Narkatiaganj Depot', latitude: 27.4, longitude: 84.4, address: 'West Champaran, Narkatiaganj' },
        { name: 'Lauriya Point', latitude: 27.0, longitude: 84.5, address: 'West Champaran, Lauriya' },
        { name: 'Piprasi Halt', latitude: 27.15, longitude: 83.9, address: 'West Champaran, Piprasi' },
        { name: 'Madhubani Stop', latitude: 27.25, longitude: 84.15, address: 'West Champaran, Madhubani' },
        { name: 'Bhitaha Junction', latitude: 26.9, longitude: 84.6, address: 'West Champaran, Bhitaha' },
        { name: 'Arwal Store', latitude: 25.2, longitude: 84.7, address: 'Arwal, Arwal' },
    ];

    for (const loc of locations) {
        await prisma.location.create({
            data: {
                ...loc,
                organizationId: org.id
            }
        });
    }

    console.log(`Seeded ${locations.length} locations.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
