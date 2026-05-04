const fs = require('fs');
let c = fs.readFileSync('c:/project/components/omes/project-detail-page.tsx', 'utf8');
const hasCRLF = c.includes('\r\n');
if (hasCRLF) c = c.replace(/\r\n/g, '\n');
let count = 0;

function rep(old, nw) {
  if (c.includes(old)) {
    c = c.replace(old, nw);
    count++;
  } else {
    console.warn('NOT FOUND:', old.substring(0, 80));
  }
}

// 1. TicketTab form - severity
rep(
  `<div><label className="block text-xs font-medium text-gray-700 mb-1">Má»©c Ä'á»™</label><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Issue['severity'] })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">{severities.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>`,
  `<div><label className="block text-xs font-medium text-gray-700 mb-1">Má»©c Ä'á»™</label><SearchableSelect value={form.severity} onChange={(v) => setForm({ ...form, severity: v as Issue['severity'] })} options={severities.map((s) => ({ value: s, label: s }))} placeholder="Chọn mức độ" className="w-full" /></div>`
);

// 2. DocumentsTab filter - filterType
rep(
  `          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Táº¥t cáº£ loáº¡i tÃ i liá»‡u</option>{DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>`,
  `<SearchableSelect value={filterType} onChange={setFilterType} options={[{ value: '', label: 'Tất cả loại tài liệu' }, ...DOC_TYPES.map((t) => ({ value: t, label: t }))]} placeholder="Tất cả loại tài liệu" />`
);

// 3. DocumentsTab form - form.type (DocType)
rep(
  `                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DocType })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>`,
  `                  <SearchableSelect value={form.type} onChange={(v) => setForm({ ...form, type: v as DocType })} options={DOC_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Chọn loại" className="w-full" />`
);

// 4. MembersTab filter - roleFilter
rep(
  `        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Táº¥t cáº£ vai trÃ²</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>`,
  `        <SearchableSelect value={roleFilter} onChange={setRoleFilter} options={[{ value: '', label: 'Tất cả vai trò' }, ...roles.map((r) => ({ value: r, label: r }))]} placeholder="Tất cả vai trò" />`
);

// 5. MembersTab filter - statusFilter
rep(
  `        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>`,
  `        <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} placeholder="Tất cả trạng thái" />`
);

// 6. MembersTab form - projectPermission
rep(
  `              <select className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs" value={form.projectPermission ?? 'Member'} onChange={(e) => setForm((f) => ({ ...f, projectPermission: e.target.value as Resource['projectPermission'] }))}>
                <option>Admin</option><option>Project Manager</option><option>Member</option><option>Viewer</option><option>Stakeholder</option>
              </select>`,
  `              <SearchableSelect value={form.projectPermission ?? 'Member'} onChange={(v) => setForm((f) => ({ ...f, projectPermission: v as Resource['projectPermission'] }))} options={['Admin', 'Project Manager', 'Member', 'Viewer', 'Stakeholder'].map((p) => ({ value: p, label: p }))} placeholder="Chọn quyền" className="w-full" />`
);

// 7. MembersTab form - status
rep(
  `              <select className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs" value={form.status ?? 'Active'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Resource['status'] }))}>
                <option>Active</option><option>Inactive</option>
              </select>`,
  `              <SearchableSelect value={form.status ?? 'Active'} onChange={(v) => setForm((f) => ({ ...f, status: v as Resource['status'] }))} options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} placeholder="Chọn trạng thái" className="w-full" />`
);

// 8. MembersTab form - allocationType
rep(
  `              <select className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs" value={form.allocationType ?? 'Fixed'} onChange={(e) => setForm((f) => ({ ...f, allocationType: e.target.value as Resource['allocationType'] }))}>
                <option>Fixed</option><option>Shared</option>
              </select>`,
  `              <SearchableSelect value={form.allocationType ?? 'Fixed'} onChange={(v) => setForm((f) => ({ ...f, allocationType: v as Resource['allocationType'] }))} options={[{ value: 'Fixed', label: 'Fixed' }, { value: 'Shared', label: 'Shared' }]} placeholder="Loại phân bổ" className="w-full" />`
);

// 9. MembersTab form - fullOrPartTime
rep(
  `              <select className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs" value={form.fullOrPartTime ?? 'Full-time'} onChange={(e) => setForm((f) => ({ ...f, fullOrPartTime: e.target.value as Resource['fullOrPartTime'] }))}>
                <option>Full-time</option><option>Part-time</option>
              </select>`,
  `              <SearchableSelect value={form.fullOrPartTime ?? 'Full-time'} onChange={(v) => setForm((f) => ({ ...f, fullOrPartTime: v as Resource['fullOrPartTime'] }))} options={[{ value: 'Full-time', label: 'Full-time' }, { value: 'Part-time', label: 'Part-time' }]} placeholder="Full/Part time" className="w-full" />`
);

// 10. ActivityTab filter - filterOwner
rep(
  `        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Táº¥t cáº£ thÃ nh viÃªn</option>{owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>`,
  `        <SearchableSelect value={filterOwner} onChange={setFilterOwner} options={[{ value: '', label: 'Tất cả thành viên' }, ...owners.map((o) => ({ value: o, label: o }))]} placeholder="Tất cả thành viên" />`
);

// 11. ActivityTab filter - filterModule
rep(
  `        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">Táº¥t cáº£ module</option>{modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>`,
  `        <SearchableSelect value={filterModule} onChange={setFilterModule} options={[{ value: '', label: 'Tất cả module' }, ...modules.map((m) => ({ value: m, label: m }))]} placeholder="Tất cả module" />`
);

// 12. MilestoneTab filter - statusFilter
rep(
  `          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>`,
  `          <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))]} placeholder="Tất cả trạng thái" />`
);

// 13. MilestoneTab filter - ownerFilter
rep(
  `          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Táº¥t cáº£ owner</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>`,
  `          <SearchableSelect value={ownerFilter} onChange={setOwnerFilter} options={[{ value: '', label: 'Tất cả owner' }, ...owners.map((o) => ({ value: o, label: o }))]} placeholder="Tất cả owner" />`
);

// 14. MilestoneTab form - form.status
rep(
  `                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">`,
  `                <SearchableSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} placeholder="Chọn trạng thái" className="w-full" />`
);

if (hasCRLF) c = c.replace(/\n/g, '\r\n');
if (hasCRLF) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync('c:/project/components/omes/project-detail-page.tsx', c, 'utf8');
console.log(`Done. ${count} replacements made.`);

// --- Regex round for encoding-sensitive replacements ---
let c2 = fs.readFileSync('c:/project/components/omes/project-detail-page.tsx', 'utf8');
const hasCRLF2 = c2.includes('\r\n');
if (hasCRLF2) c2 = c2.replace(/\r\n/g, '\n');
let n2 = 0;

// Severity select in TicketTab form
c2 = c2.replace(
  /(<div><label[^>]*>[^<]*<\/label>)<select value=\{form\.severity\} onChange=\{[^}]+\} className="[^"]*">\{severities\.map[^<]*<\/select><\/div>/,
  '$1<SearchableSelect value={form.severity} onChange={(v) => setForm({ ...form, severity: v as Issue[\'severity\'] })} options={severities.map((s) => ({ value: s, label: s }))} placeholder="Ch\u1ecdn m\u1ee9c \u0111\u1ed9" className="w-full" /></div>'
);
if (!c2.includes('value={form.severity} onChange={(e)')) n2++;

// filterType select in DocumentsTab (multiline)
c2 = c2.replace(
  /<select value=\{filterType\}[^>]*>[\s\S]*?<\/select>/,
  '<SearchableSelect value={filterType} onChange={setFilterType} options={[{ value: \'\', label: \'T\u1ea5t c\u1ea3 lo\u1ea1i t\u00e0i li\u1ec7u\' }, ...DOC_TYPES.map((t) => ({ value: t, label: t }))]} placeholder="T\u1ea5t c\u1ea3 lo\u1ea1i t\u00e0i li\u1ec7u" />'
);
if (!c2.includes('value={filterType} onChange={(e)')) n2++;

// filterOwner select in ActivityTab (multiline)
c2 = c2.replace(
  /<select value=\{filterOwner\}[^>]*>[\s\S]*?<\/select>/,
  '<SearchableSelect value={filterOwner} onChange={setFilterOwner} options={[{ value: \'\', label: \'T\u1ea5t c\u1ea3 th\u00e0nh vi\u00ean\' }, ...owners.map((o) => ({ value: o, label: o }))]} placeholder="T\u1ea5t c\u1ea3 th\u00e0nh vi\u00ean" />'
);
if (!c2.includes('value={filterOwner} onChange={(e)')) n2++;

if (hasCRLF2) c2 = c2.replace(/\n/g, '\r\n');
fs.writeFileSync('c:/project/components/omes/project-detail-page.tsx', c2, 'utf8');
// --- Final regex cleanup for severity ---
let c3 = fs.readFileSync('c:/project/components/omes/project-detail-page.tsx', 'utf8');
c3 = c3.replace(
  /<select value=\{form\.severity\}[\s\S]+?<\/select>/,
  "<SearchableSelect value={form.severity} onChange={(v) => setForm({ ...form, severity: v as Issue['severity'] })} options={severities.map((s) => ({ value: s, label: s }))} placeholder=\"Chọn mức độ\" className=\"w-full\" />"
);
fs.writeFileSync('c:/project/components/omes/project-detail-page.tsx', c3, 'utf8');
const remaining = (c3.match(/<select /g) || []).length;
console.log('Remaining native selects:', remaining);
