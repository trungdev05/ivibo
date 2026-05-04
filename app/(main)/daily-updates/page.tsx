import { EntityTablePage } from '@/components/omes/entity-table-page';

export default function OmesDailyUpdatesRoute() {
  return (
    <EntityTablePage
      title="Daily Updates"
      endpoint="/api/daily-updates"
      columns={[
        { key: 'date', label: 'Date' },
        { key: 'owner', label: 'Owner' },
        { key: 'status', label: 'Status' },
        { key: 'workDoneToday', label: 'Work Done Today' },
        { key: 'planForTomorrow', label: 'Plan for Tomorrow' },
        { key: 'blockers', label: 'Blockers' },
      ]}
      defaultForm={{
        date: '2026-05-01',
        projectId: '',
        moduleId: '',
        workDoneToday: '',
        planForTomorrow: '',
        blockers: '',
        owner: '',
        status: 'Doing',
        customerFeedback: '',
        internalNotes: '',
      }}
    />
  );
}
