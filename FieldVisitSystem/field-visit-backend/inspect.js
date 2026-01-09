
const fs = require('fs');
const content = fs.readFileSync('d:\\Project\\FieldVisitSystem\\field-visit-app\\assets\\BMSK_Master_Station_list.csv', 'utf-8');
const lines = content.split('\n');
console.log(lines[0].split(',').join('\n'));
