import { type DataPoint, type MetricId } from '../types.ts';

export const exportDataToCSV = (dataHistory: Record<MetricId, DataPoint[]>) => {
  const headers = ['timestamp', ...Object.keys(dataHistory)];
  let csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n';

  const timestamps = new Set<number>();
  Object.values(dataHistory).forEach(history => {
    history.forEach(dp => timestamps.add(dp.time));
  });

  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

  sortedTimestamps.forEach(time => {
    const date = new Date(time).toISOString();
    const row = [date];
    for (const metricId of Object.keys(dataHistory)) {
      const dataPoint = dataHistory[metricId].find(dp => dp.time === time);
      row.push(dataPoint ? String(dataPoint.value) : '');
    }
    csvContent += row.join(',') + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const now = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  link.setAttribute('download', `dashboard_data_${now}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};