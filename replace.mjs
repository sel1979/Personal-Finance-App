import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-white dark:bg-slate-800/50');
  content = content.replace(/dark:border-slate-800/g, 'dark:border-slate-700/50');
  fs.writeFileSync(filePath, content, 'utf8');
}

const dir = './pages';
const files = fs.readdirSync(dir);
files.forEach(file => {
  if (file.endsWith('.tsx')) {
    replaceInFile(path.join(dir, file));
  }
});
replaceInFile('./App.tsx');
console.log('Replaced successfully.');
