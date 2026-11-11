import { DashboardSnapshot } from '../data/types';

export function downloadSnapshot020502Csv(snapshot: DashboardSnapshot): void {
  if (!snapshot.ec || !snapshot.ec.h || !snapshot.ec.r) {
    alert('Os dados da 02.05.02 deste snapshot não estão disponíveis.');
    return;
  }

  const delimiter = ';';
  const formatCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(delimiter) || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = snapshot.ec.h.map(formatCell).join(delimiter);
  const dataLines = snapshot.ec.r.map((row) => row.map(formatCell).join(delimiter));

  const csvContent = '\ufeff' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `02_05_02_fechamento_${snapshot.date.replace(/-/g, '')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
