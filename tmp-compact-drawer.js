const fs = require('fs');
const p = 'components/omes/work-management-page.tsx';
let c = fs.readFileSync(p, 'utf8');

const replacements = [
  ['max-w-lg', 'max-w-[520px]'],
  ['px-5 pt-4 pb-3 border-b border-gray-100 shrink-0', 'px-4 pt-3 pb-2 border-b border-gray-100 shrink-0'],
  ['flex items-center justify-between mt-3', 'flex items-center justify-between mt-2'],
  ['flex items-start border-b border-gray-50 px-5 py-3 gap-3 hover:bg-gray-50/50 transition-colors', 'grid grid-cols-[132px_minmax(0,1fr)] items-start border-b border-gray-50 px-4 py-2.5 gap-2 hover:bg-gray-50/50 transition-colors'],
  ['flex items-center gap-2 w-44 shrink-0 pt-1 text-gray-400', 'flex items-center gap-1.5 min-w-0 text-gray-400'],
  ['<span className="text-sm text-gray-500">{label}</span>', '<span className="text-[13px] text-gray-500">{label}</span>'],
  ['flex-1 min-w-0 pt-0.5', 'min-w-0'],
  ['shrink-0 border-t border-gray-100 px-5 py-3 flex items-center justify-end gap-2 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.04)]', 'shrink-0 border-t border-gray-100 px-4 py-2.5 flex items-center justify-end gap-2 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.04)]'],
];

for (const [from, to] of replacements) {
  c = c.replace(from, to);
}

fs.writeFileSync(p, c, 'utf8');
console.log('done');
