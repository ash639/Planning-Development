const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'assets', 'BMSKnew.csv');
const data = fs.readFileSync(csvPath, 'utf8');
const lines = data.split('\n');
const headers = lines[0].split(',').map(h => h.trim());

const latIdx = headers.indexOf('latitude');
const lngIdx = headers.indexOf('longitude');
const typeIdx = headers.indexOf('station_type');
const nameIdx = headers.indexOf('location');

const districtIdx = headers.indexOf('district_name');
const blockIdx = headers.indexOf('block_name');
const agencyIdx = headers.indexOf('agency');
const dateIdx = headers.indexOf('last_visited_date');
const probIdx = headers.indexOf('is_problematic');

const stations = [];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split (assuming no commas in fields for simplicity, or handle basic quotes)
    const parts = line.split(',');

    const lat = parseFloat(parts[latIdx]);
    const lng = parseFloat(parts[lngIdx]);
    const type = parts[typeIdx]?.trim();
    const name = parts[nameIdx]?.trim();
    const district = parts[districtIdx]?.trim();
    const block = parts[blockIdx]?.trim();
    const agency = parts[agencyIdx]?.trim();
    const lastVisited = parts[dateIdx]?.trim();
    const problem = parts[probIdx]?.trim();

    if (!isNaN(lat) && !isNaN(lng) && (type === 'AWS' || type === 'ARG')) {
        stations.push({ name, lat, lng, type, district, block, agency, lastVisited, problem });
    }
}

const tsContent = `export const stations = ${JSON.stringify(stations, null, 2)};`;
fs.writeFileSync(path.join(__dirname, 'app', 'data', 'stations.ts'), tsContent);
console.log('Done: ' + stations.length);
