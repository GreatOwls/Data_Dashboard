import React, { useState } from 'react';
import { type MetricConfig, type MetricId } from '../types.ts';
import { modbusService } from '../services/modbusService.ts';
import { TrashIcon } from './Icons.tsx';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ConfigurationPageProps {
    metricConfigs: Record<MetricId, MetricConfig>;
    setMetricConfigs: React.Dispatch<React.SetStateAction<Record<MetricId, MetricConfig>>>;
    connectionStatus: ConnectionStatus;
    setConnectionStatus: (status: ConnectionStatus) => void;
    onAddSensor: () => void;
    onDeleteSensor: (metricId: MetricId) => void;
}

const ConnectionStatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
    const statusInfo = {
        disconnected: { text: 'Disconnected', color: 'bg-gray-400' },
        connecting: { text: 'Connecting...', color: 'bg-yellow-400 animate-pulse' },
        connected: { text: 'Connected', color: 'bg-green-500' },
        error: { text: 'Connection Error', color: 'bg-red-500' },
    };

    return (
        <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${statusInfo[status].color}`}></span>
            <span className="text-sm font-medium">{statusInfo[status].text}</span>
        </div>
    );
};

export const ConfigurationPage: React.FC<ConfigurationPageProps> = ({
    metricConfigs,
    setMetricConfigs,
    connectionStatus,
    setConnectionStatus,
    onAddSensor,
    onDeleteSensor,
}) => {
    const [ip, setIp] = useState('127.0.0.1');
    const [port, setPort] = useState(502);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        setError(null);
        setConnectionStatus('connecting');
        try {
            await modbusService.connect(ip, port);
            setConnectionStatus('connected');
        } catch (err) {
            setConnectionStatus('error');
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    const handleDisconnect = async () => {
        await modbusService.disconnect();
        setConnectionStatus('disconnected');
    };

    const handleConfigChange = <K extends keyof MetricConfig>(
        metricId: MetricId,
        field: K,
        value: MetricConfig[K]
    ) => {
        setMetricConfigs(prev => ({
            ...prev,
            [metricId]: {
                ...prev[metricId],
                [field]: value,
            },
        }));
    };

    return (
        <div className="space-y-8 text-light-text dark:text-dark-text">
            {/* Connection Settings */}
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-4 sm:p-6">
                <h2 className="text-xl font-bold mb-4">Modbus TCP Connection</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="ip-address" className="block text-sm font-medium mb-1">IP Address</label>
                        <input
                            type="text"
                            id="ip-address"
                            value={ip}
                            onChange={e => setIp(e.target.value)}
                            className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded px-3 py-2"
                            disabled={connectionStatus === 'connecting' || connectionStatus === 'connected'}
                        />
                    </div>
                    <div>
                        <label htmlFor="port" className="block text-sm font-medium mb-1">Port</label>
                        <input
                            type="number"
                            id="port"
                            value={port}
                            onChange={e => setPort(parseInt(e.target.value))}
                            className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded px-3 py-2"
                            disabled={connectionStatus === 'connecting' || connectionStatus === 'connected'}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
                            <button onClick={handleConnect} className="w-full bg-success text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                                Connect
                            </button>
                        ) : (
                            <button onClick={handleDisconnect} disabled={connectionStatus === 'connecting'} className="w-full bg-danger text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50">
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>
                <div className="mt-4">
                    <ConnectionStatusIndicator status={connectionStatus} />
                    {error && <p className="text-danger text-sm mt-2">{error}</p>}
                </div>
            </div>

            {/* Sensor Configuration */}
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-4 sm:p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Sensor Configuration</h2>
                    <button onClick={onAddSensor} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors text-sm font-semibold">
                        Add Sensor
                    </button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-light-bg dark:bg-dark-bg">
                            <tr>
                                <th className="px-4 py-3">Enabled</th>
                                <th className="px-4 py-3">Sensor Name</th>
                                <th className="px-4 py-3">Unit</th>
                                <th className="px-4 py-3">Chart Type</th>
                                <th className="px-4 py-3">Slave ID</th>
                                <th className="px-4 py-3">Register Type</th>
                                <th className="px-4 py-3">Address</th>
                                <th className="px-4 py-3">Decimal Pt.</th>
                                <th className="px-4 py-3">Scale Low</th>
                                <th className="px-4 py-3">Scale High</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(metricConfigs).map((config: MetricConfig) => (
                                <tr key={config.id} className="border-b border-light-border dark:border-dark-border">
                                    <td className="px-4 py-3">
                                        <label htmlFor={`enable-${config.id}`} className="flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input type="checkbox" id={`enable-${config.id}`} className="sr-only" checked={config.enabled} onChange={e => handleConfigChange(config.id, 'enabled', e.target.checked)} />
                                                <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
                                                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
                                            </div>
                                        </label>
                                        <style>{`
                                            input:checked ~ .dot { transform: translateX(100%); }
                                            input:checked ~ .block { background-color: #16a34a; }
                                        `}</style>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="text" value={config.name} onChange={e => handleConfigChange(config.id, 'name', e.target.value)} className="w-32 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="text" value={config.unit} onChange={e => handleConfigChange(config.id, 'unit', e.target.value)} className="w-16 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <select value={config.chartType} onChange={e => handleConfigChange(config.id, 'chartType', e.target.value as 'Line' | 'Bar' | 'Gauge')} className="w-24 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded border border-light-border dark:border-dark-border">
                                            <option value="Line" className="bg-light-card dark:bg-dark-card">Line</option>
                                            <option value="Bar" className="bg-light-card dark:bg-dark-card">Bar</option>
                                            <option value="Gauge" className="bg-light-card dark:bg-dark-card">Gauge</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="number" value={config.slaveId} onChange={e => handleConfigChange(config.id, 'slaveId', parseInt(e.target.value))} className="w-16 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded" />
                                    </td>
                                     <td className="px-4 py-3">
                                        <select value={config.registerType} onChange={e => handleConfigChange(config.id, 'registerType', e.target.value as 'Holding' | 'Input')} className="w-28 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded border border-light-border dark:border-dark-border">
                                            <option value="Holding" className="bg-light-card dark:bg-dark-card">Holding</option>
                                            <option value="Input" className="bg-light-card dark:bg-dark-card">Input</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="number" value={config.address} onChange={e => handleConfigChange(config.id, 'address', parseInt(e.target.value))} className="w-20 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="number" value={config.decimalPoint} onChange={e => handleConfigChange(config.id, 'decimalPoint', parseInt(e.target.value))} className="w-16 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="number" value={config.scaleLow} onChange={e => handleConfigChange(config.id, 'scaleLow', parseFloat(e.target.value))} className="w-20 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="number" value={config.scaleHigh} onChange={e => handleConfigChange(config.id, 'scaleHigh', parseFloat(e.target.value))} className="w-20 bg-transparent focus:bg-light-bg dark:focus:bg-dark-bg outline-none p-1 rounded" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => onDeleteSensor(config.id)} className="text-danger hover:text-red-400 p-1 rounded-full" title="Delete Sensor">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};