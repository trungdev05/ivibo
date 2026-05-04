const fs = require('fs');
let c = fs.readFileSync('c:/project/components/omes/project-detail-page.tsx', 'utf8').replace(/\r/g, '');

let count = 0;
c = c.replace(/<input\s+type="date"\s+([^/]*?)\/>/g, (match, attrs) => {
  const valueM = attrs.match(/value=\{([^}]+)\}/);
  const classM = attrs.match(/className="([^"]+)"/);
  // Extract onChange handler: onChange={(e) => ...}
  const onChangeM = attrs.match(/onChange=\{(\(e\)\s*=>\s*[^}]+(\{[^}]*\})?[^}]*)\}/);

  if (!valueM || !onChangeM) {
    console.log('Could not parse:', match.substring(0, 120));
    return match;
  }

  const value = valueM[1];
  const onChangeBody = onChangeM[1]; // e.g. (e) => setForm({...form, dueDate: e.target.value})
  // Replace e.target.value with v, and wrap in (v) =>
  const newOnChange = '(v) => ' + onChangeBody.replace(/\(e\)\s*=>\s*/, '').replace(/e\.target\.value/g, 'v');
  const className = classM ? classM[1] : '';

  count++;
  return `<DatePicker value={${value}} onChange={${newOnChange}} className="${className}" />`;
});

console.log('Replaced:', count);
console.log('Remaining type="date":', (c.match(/type="date"/g) || []).length);
fs.writeFileSync('c:/project/components/omes/project-detail-page.tsx', c, 'utf8');
console.log('Done');
