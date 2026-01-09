
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    // 1. Path to new CSV
    const csvPath = 'd:\\Project\\FieldVisitSystem\\field-visit-app\\assets\\BMSK021.csv';

    if (!fs.existsSync(csvPath)) {
        console.error('File not found:', csvPath);
        return;
    }

    // 2. Clear Existing Locations
    console.log('Deleting existing locations...');
    await prisma.visit.deleteMany({}); // Delete visits first due to FK
    await prisma.location.deleteMany({});
    console.log('Locations cleared.');

    // 3. Import New Data
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    const org = await prisma.organization.findFirst();
    if (!org) { console.error('No Org'); return; }

    console.log(`Importing ${lines.length - 1} stations...`);

    let created = 0;
    // Indices: 0=ID, 4=District, 6=Block, 9=LocationName, 10=Lng, 11=Lat, 12=Type

    // Batch create? Or loop. Loop is fine for <10k.
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim());
        if (row.length < 12) continue;

        const id = row[0];
        const dist = row[4];
        const block = row[6];
        const locName = row[9];
        const lng = parseFloat(row[10]) || 0;
        const lat = parseFloat(row[11]) || 0;
        const type = row[12];

        await prisma.location.create({
            data: {
                name: id, // Station Number as Name (Title)
                district: dist,
                block: block,
                stationType: type,
                address: locName, // Location Name as Address (Subtitle)
                latitude: lat,
                longitude: lng,
                organizationId: org.id
            }
        });
        created++;
        if (created % 100 === 0) process.stdout.write('.');
    }

    console.log(`\nImported ${created} stations from BMSK021.csv`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => await prisma.$disconnect());
