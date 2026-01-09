
const fs = require('fs');
const content = fs.readFileSync('d:\\Project\\FieldVisitSystem\\field-visit-app\\assets\\BMSK021.csv', 'utf-8');
const lines = content.split('\n');
const headers = lines[0].split(',');
headers.forEach((h, i) => console.log(`${i}: ${h}`));
