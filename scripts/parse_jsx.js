const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'page.js'), 'utf8');
try {
  acorn.Parser.extend(jsx()).parse(src, { ecmaVersion: 2020, sourceType: 'module' });
  console.log('Parsed OK');
} catch (e) {
  console.error('Parse error:', e.message);
  console.error('At:', e.loc);
  if (e.loc && e.loc.line) {
    const lines = src.split(/\r?\n/);
    const L = e.loc.line;
    const start = Math.max(0, L-4);
    const end = Math.min(lines.length, L+3);
    console.error('Context:');
    for (let i = start; i < end; i++) {
      const num = i+1;
      console.error(`${num}: ${lines[i]}`);
    }
  }
}
