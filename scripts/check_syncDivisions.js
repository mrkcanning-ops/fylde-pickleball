const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'page.js'), 'utf8');
const start = src.indexOf('const syncDivisions = async');
if (start === -1) { console.log('not found'); process.exit(1); }
const sub = src.slice(start, start+10000);
const endIdx = sub.indexOf('\n};');
const funcText = sub.slice(0, endIdx+3);
console.log('Function length', funcText.split('\n').length);

function check(text) {
  let line = 1, col = 0;
  let inSingle = false, inDouble = false, inBack = false, inBlockComment = false, inLineComment = false, inTemplate = false;
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    col++;
    if (ch === '\n') { line++; col = 0; inLineComment = false; }
    const prev = text[i-1];
    if (!inSingle && !inDouble && !inBack && !inBlockComment && !inLineComment && !inTemplate) {
      if (ch === "'") { inSingle = true; continue; }
      if (ch === '"') { inDouble = true; continue; }
      if (ch === '`') { inTemplate = true; continue; }
      if (ch === '/' && text[i+1] === '*') { inBlockComment = true; i++; col++; continue; }
      if (ch === '/' && text[i+1] === '/') { inLineComment = true; i++; col++; continue; }
    } else {
      if (inSingle && ch === "'" && prev !== '\\') { inSingle = false; continue; }
      if (inDouble && ch === '"' && prev !== '\\') { inDouble = false; continue; }
      if (inTemplate && ch === '`' && prev !== '\\') { inTemplate = false; continue; }
      if (inBlockComment && ch === '/' && prev === '*') { inBlockComment = false; continue; }
      continue;
    }

    if (ch === '{') { stack.push({ch:'{',line,col}); }
    else if (ch === '}') {
      if (stack.length === 0 || stack[stack.length-1].ch !== '{') { console.log('Unmatched } at', line, col); return; }
      stack.pop();
    } else if (ch === '(') { stack.push({ch:'(',line,col}); }
    else if (ch === ')') {
      if (stack.length === 0 || stack[stack.length-1].ch !== '(') { console.log('Unmatched ) at', line, col); return; }
      stack.pop();
    }
  }
  if (stack.length === 0) console.log('All matched.'); else console.log('Unmatched stack:', stack);
}

console.log(funcText);
check(funcText);
