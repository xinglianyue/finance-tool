import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedDataPath = path.join(__dirname, 'shared-data.json');
const indexPath = path.join(__dirname, 'index.json');

try {
  const data = JSON.parse(fs.readFileSync(sharedDataPath, 'utf8'));
  
  const index = data.map(item => ({
    date: item.date,
    updatedAt: item.updatedAt,
    uploadedBy: item.uploadedBy,
    fileName: item.fileName
  }));
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  
  console.log('index.json generated successfully!');
  console.log('Number of records:', index.length);
  console.log('File size:', fs.statSync(indexPath).size, 'bytes');
} catch (e) {
  console.error('Error:', e);
}
