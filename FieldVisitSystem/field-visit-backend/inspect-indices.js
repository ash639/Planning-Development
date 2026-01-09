
const fs = require('fs');
const content = fs.readFileSync('d:\\Project\\FieldVisitSystem\\field-visit-app\\assets\\BMSK021.csv', 'utf-8');
const lines = content.split('\n');
const row1 = lines[1].split(',');
console.log('Row 1 [9 - Location]:', row1[9]);
console.log('Row 1 [0 - ID]:', row1[0]);
