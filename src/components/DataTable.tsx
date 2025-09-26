import React, { useMemo, useState } from 'react';
import { type DataPoint, type MetricId, type Settings, MetricStatus, type MetricConfig } from '../types.ts';
import { getStatus } from './MetricCharts.tsx';

interface DataTableProps {
    metricConfigs: Record<MetricId, MetricConfig>;
    dataHistory: Record<MetricId, DataPoint[]>;
    settings: Settings;
}

type TableRow = {
    time: number;
} & Record<string, number | null>;


const statusText = {
  [MetricStatus.Normal]: 'text-inherit',
  [MetricStatus.Warning]: 'text-warning',
  [MetricStatus.Critical]: 'text-danger font-bold',
}

export const DataTable: React.FC<DataTableProps> = ({ metricConfigs, dataHistory, settings }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const enabledMetricIds = useMemo(() => 
        // FIX: Add explicit type to the parameter of the filter function to fix property access on 'unknown' type.
        Object.values(metricConfigs).filter((c: MetricConfig) => c.enabled).map(c => c.id), 
        [metricConfigs]
    );

    const tableData: TableRow[] = useMemo(() => {
        if (enabledMetricIds.length === 0) return [];
        
        const timestamps = new Set<number>();
        enabledMetricIds.forEach(metricId => {
            dataHistory[metricId]?.forEach(dp => timestamps.add(dp.time));
        });

        const sortedTimestamps = Array.from(timestamps).sort((a, b) => b - a); // Newest first

        return sortedTimestamps.map(time => {
            const row: any = { time };
            for (const metricId of enabledMetricIds) {
                const dataPoint = dataHistory[metricId as MetricId]?.find(dp => dp.time === time);
                row[metricId as MetricId] = dataPoint ? dataPoint.value : null;
            }
            return row;
        });
    }, [dataHistory, enabledMetricIds]);
    
    const totalPages = Math.ceil(tableData.length / itemsPerPage);
    const paginatedData = tableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-4 sm:p-6 text-light-text dark:text-dark-text">
            <h2 className="text-xl font-bold mb-4">Sensor Data History</h2>
            {enabledMetricIds.length > 0 ? (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-light-bg dark:bg-dark-bg">
                                <tr>
                                    <th scope="col" className="px-6 py-3 rounded-l-lg">Timestamp</th>
                                    {enabledMetricIds.map(id => (
                                        <th scope="col" key={id} className="px-6 py-3">{metricConfigs[id].name} ({metricConfigs[id].unit})</th>
                                    ))}
                                    <th scope="col" className="px-6 py-3 rounded-r-lg"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map(row => (
                                    <tr key={row.time} className="border-b border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg/50">
                                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                                            {new Date(row.time).toLocaleString()}
                                        </td>
                                        {enabledMetricIds.map(id => {
                                            const value = row[id];
                                            if (value === null || value === undefined) {
                                                return <td key={id} className="px-6 py-4">-</td>;
                                            }
                                            const status = getStatus(value, settings[id]);
                                            return (
                                                <td key={id} className={`px-6 py-4 ${statusText[status]}`}>
                                                    {value.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                        <td></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <nav className="flex items-center justify-between pt-4" aria-label="Table navigation">
                        <span className="text-sm font-normal">
                            Showing <span className="font-semibold">{Math.min(1 + (currentPage - 1) * itemsPerPage, tableData.length)}-{Math.min(currentPage * itemsPerPage, tableData.length)}</span> of <span className="font-semibold">{tableData.length}</span>
                        </span>
                        <ul className="inline-flex items-center -space-x-px">
                            <li>
                                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-2 ml-0 leading-tight rounded-l-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card hover:bg-light-bg dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed">
                                    Previous
                                </button>
                            </li>
                            <li>
                                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-2 leading-tight rounded-r-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card hover:bg-light-bg dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed">
                                    Next
                                </button>
                            </li>
                        </ul>
                    </nav>
                </>
            ) : (
                <div className="text-center py-10">
                    <p className="text-gray-500">No sensors enabled. Go to the Configuration page to enable sensors.</p>
                </div>
            )}
        </div>
    );
};