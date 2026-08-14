
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function countRecords() {
  try {
    const dataPath = path.join(__dirname, 'shared-data.json');
    const dataContent = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(dataContent);
    
    console.log('Total records:', data.length);
    console.log('');
    console.log('Record dates:');
    
    for (let i = 0; i < data.length; i++) {
      console.log(i + 1 + '. ' + data[i].date + ' - ' + data[i].fileName);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

countRecords();
