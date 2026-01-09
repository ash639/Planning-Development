const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'stations.json');
const outPath = path.join(__dirname, 'app', 'data', 'stations.ts');

const data = fs.readFileSync(jsonPath, 'utf8');
// To avoid encoding issues from PowerShell redirect, let's parse and re-stringify
const jsonData = JSON.parse(data);

const tsContent = `export const stations = ${JSON.stringify(jsonData, null, 2)};`;

fs.writeFileSync(outPath, tsContent);
console.log('Created stations.ts with ' + jsonData.length + ' stations.');
