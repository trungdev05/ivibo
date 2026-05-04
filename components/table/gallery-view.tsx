'use client';
import { useTableStore } from '@/store/table-store';
import { Field, RecordRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export function GalleryView() {
  const { fields, getVisibleRecords, tableId, addRecord } = useTableStore();
  const records = getVisibleRecords();
  const primaryField = fields.find((f) => f.is_primary) ?? fields[0];
  const secondaryFields = fields.filter((f) => !f.is_primary).slice(0, 4);

  const handleAdd = async () => {
    if (!tableId) return;
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, cells: {} }),
    });
    const { data } = await res.json();
    if (data) addRecord({ ...data, cells: data.cells ?? {} });
  };

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {records.map((record) => (
          <GalleryCard
            key={record.id}
            record={record}
            primaryField={primaryField}
            secondaryFields={secondaryFields}
          />
        ))}
        {/* Add card */}
        <button
          onClick={handleAdd}
          className="flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-600 gap-2"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs font-medium">Add record</span>
        </button>
      </div>
    </div>
  );
}

function GalleryCard({
  record,
  primaryField,
  secondaryFields,
}: {
  record: RecordRow;
  primaryField: Field | undefined;
  secondaryFields: Field[];
}) {
  const title = primaryField ? String(record.cells[primaryField.id] ?? '') : '';

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Color accent bar based on a select field */}
      <div className="h-2 bg-indigo-400" />
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2">{title || 'Untitled'}</p>
        {secondaryFields.map((f) => {
          const val = record.cells[f.id];
          if (val === null || val === undefined) return null;
          if (f.type === 'checkbox') {
            return (
              <div key={f.id} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{f.name}:</span>
                <input type="checkbox" readOnly checked={!!val} className="accent-indigo-600 w-3.5 h-3.5" />
              </div>
            );
          }
          if (f.type === 'select') {
            const choice = f.options?.choices?.find((c) => c.id === val);
            return choice ? (
              <span key={f.id} className={cn('self-start px-2 py-0.5 rounded-full text-xs font-medium', choice.color)}>
                {choice.name}
              </span>
            ) : null;
          }
          return (
            <p key={f.id} className="text-xs text-gray-500 truncate">
              <span className="font-medium">{f.name}:</span> {String(val)}
            </p>
          );
        })}
      </div>
    </div>
  );
}
