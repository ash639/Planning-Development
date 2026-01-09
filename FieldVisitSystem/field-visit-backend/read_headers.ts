
import * as fs from 'fs';
import * as path from 'path';


const filePath = 'd:\\Project\\FieldVisitSystem\\field-visit-app\\assets\\BMSKnew.csv';

const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
const lines = fileContent.split('\n').slice(0, 5);

const output = `HEADERS: ${JSON.stringify(lines[0].split(','))}\nROW 1: ${JSON.stringify(lines[1].split(','))}`;
fs.writeFileSync('headers.txt', output);
console.log('Done');

