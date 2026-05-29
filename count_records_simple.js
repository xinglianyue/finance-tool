
const fs = require('fs');
const path = require('path');

try {
  const dataPath = path.join(__dirname, 'shared-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  console.log('Total records:', data.length);
  console.log('');
  console.log('Record dates:');
  
  for (let i = 0; i < data.length; i++) {
    console.log(i + 1 + '. ' + data[i].date + ' - ' + data[i].fileName);
  }
} catch (error) {
  console.error('Error:', error);
}
