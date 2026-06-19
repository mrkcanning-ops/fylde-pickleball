const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'page.js'), 'utf8');
let open = 0, close = 0, parOpen=0, parClose=0;
for (const ch of src) {
  if (ch === '{') open++;
  if (ch === '}') close++;
  if (ch === '(') parOpen++;
  if (ch === ')') parClose++;
}
console.log('{',open,'} ',close,' diff', open-close);
console.log('(',parOpen,')',parClose,' diff', parOpen-parClose);
