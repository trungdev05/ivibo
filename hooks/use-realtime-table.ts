'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTableStore } from '@/store/table-store';
import { CellValue } from '@/lib/types';

/**
 * Subscribes to Supabase realtime changes for the current table.
 * Patches local Zustand state on incoming events so all collaborators
 * see live updates without a full page refresh.
 */
export function useRealtimeTable(tableId: string | null) {
  const { updateCell, addRecord, removeRecord, addField, removeField, updateField } =
    useTableStore();

  useEffect(() => {
    if (!tableId) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const configured = url.includes('supabase.co') && !url.includes('your-project') && key !== 'your-anon-key';
    if (!configured) return;

    const supabase = createClient();

    // Cells channel — most frequent updates
    const cellsChannel = supabase
      .channel(`cells:${tableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cells',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const cell = payload.new as { record_id: string; field_id: string; value: CellValue };
            updateCell(cell.record_id, cell.field_id, cell.value);
          }
        }
      )
      .subscribe();

    // Records channel
    const recordsChannel = supabase
      .channel(`records:${tableId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'records',
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          const rec = payload.new as { id: string; table_id: string; position: number; created_at: string };
          addRecord({ ...rec, cells: {} });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'records',
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          removeRecord((payload.old as { id: string }).id);
        }
      )
      .subscribe();

    // Fields channel
    const fieldsChannel = supabase
      .channel(`fields:${tableId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fields',
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => addField(payload.new as Parameters<typeof addField>[0])
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fields',
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          const f = payload.new as { id: string };
          updateField(f.id, f as Parameters<typeof updateField>[1]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'fields',
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => removeField((payload.old as { id: string }).id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cellsChannel);
      supabase.removeChannel(recordsChannel);
      supabase.removeChannel(fieldsChannel);
    };
  }, [tableId, updateCell, addRecord, removeRecord, addField, removeField, updateField]);
}
