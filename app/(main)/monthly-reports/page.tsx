import { EntityTablePage } from '@/components/omes/entity-table-page';

export default function OmesMonthlyReportsRoute() {
  return (
    <EntityTablePage
      title="Monthly Reports"
      endpoint="/api/monthly-reports"
      columns={[
        { key: 'month', label: 'Month' },
        { key: 'plannedProgress', label: 'Planned %' },
        { key: 'actualProgress', label: 'Actual %' },
        { key: 'bac', label: 'BAC' },
        { key: 'pv', label: 'PV' },
        { key: 'ev', label: 'EV' },
        { key: 'ac', label: 'AC' },
        { key: 'cpi', label: 'CPI' },
        { key: 'spi', label: 'SPI' },
        { key: 'riskSummary', label: 'Risk Summary' },
      ]}
      defaultForm={{ month: '' }}
    />
  );
}
