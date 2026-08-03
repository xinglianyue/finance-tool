const fs = require('fs');
const path = require('path');

const docxPath = 'C:\\Users\\surface\\Desktop\\财务分析讨论.docx';

function extractTextFromDocx(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    
    const xmlStart = '<w:document';
    const xmlEnd = '</w:document>';
    const dataStr = data.toString('utf8');
    
    const startIdx = dataStr.indexOf(xmlStart);
    const endIdx = dataStr.indexOf(xmlEnd);
    
    if (startIdx === -1 || endIdx === -1) {
      return 'Could not find document XML';
    }
    
    const xml = dataStr.substring(startIdx, endIdx + xmlEnd.length);
    
    const textMatches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    
    if (!textMatches) {
      return 'No text found';
    }
    
    const text = textMatches
      .map(match => {
        return match.replace(/<\/?w:t[^>]*>/g, '');
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
    
  } catch (err) {
    return 'Error: ' + err.message;
  }
}

const text = extractTextFromDocx(docxPath);
console.log(text);
