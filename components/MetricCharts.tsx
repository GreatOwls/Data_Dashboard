
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { type DataPoint, type MetricConfig, MetricStatus, type Thresholds } from '../types.ts';

interface MetricCardProps {
  config: MetricConfig;
  latestData?: DataPoint;
  history: DataPoint[];
  thresholds: Thresholds;
  children: React.ReactNode;
  onChartTypeChange: (newType: 'Line' | 'Bar' | 'Gauge') => void;
}

export const getStatus = (value: number, thresholds: Thresholds): MetricStatus => {
  if (value < thresholds.criticalMin || value > thresholds.criticalMax) {
    return MetricStatus.Critical;
  }
  if (value < thresholds.warningMin || value > thresholds.warningMax) {
    return MetricStatus.Warning;
  }
  return MetricStatus.Normal;
};

const statusStyles = {
  [MetricStatus.Normal]: 'border-success',
  [MetricStatus.Warning]: 'border-warning',
  [MetricStatus.Critical]: 'border-danger animate-pulse',
};

const statusText = {
  [MetricStatus.Normal]: 'text-success',
  [MetricStatus.Warning]: 'text-warning',
  [MetricStatus.Critical]: 'text-danger',
}

export const MetricCard: React.FC<MetricCardProps> = ({ config, latestData, thresholds, children, onChartTypeChange }) => {
  const value = latestData?.value ?? ((config.scaleLow + config.scaleHigh) / 2);
  const status = getStatus(value, thresholds);

  return (
    <div className={`bg-light-card dark:bg-dark-card rounded-xl shadow-md p-4 transition-all duration-300 border-2 ${statusStyles[status]}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-light-text dark:text-dark-text">{config.name}</h3>
            <select
                value={config.chartType}
                onChange={(e) => onChartTypeChange(e.target.value as 'Line' | 'Bar' | 'Gauge')}
                className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border rounded text-xs p-1 focus:ring-2 focus:ring-primary focus:outline-none"
                aria-label={`Change chart type for ${config.name}`}
                onClick={(e) => e.stopPropagation()}
            >
                <option value="Line">Line</option>
                <option value="Bar">Bar</option>
                <option value="Gauge">Gauge</option>
            </select>
        </div>
        <span className={`text-2xl font-bold ${statusText[status]}`}>
          {value.toFixed(config.decimalPoint ?? 2)}
          <span className="text-sm ml-1 text-gray-400">{config.unit}</span>
        </span>
      </div>
      <div className="h-60 w-full">
        {children}
      </div>
    </div>
  );
};

export const LineChartCard: React.FC<Omit<MetricCardProps, 'children'>> = (props) => (
  <MetricCard {...props}>
    <ResponsiveContainer>
      <LineChart data={props.history} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} className="text-xs" />
        <YAxis domain={['dataMin - 1', 'dataMax + 1']} className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)', // slate-800 with opacity
            borderColor: '#334155', // slate-700
            color: '#f1f5f9' // slate-100
          }}
          labelFormatter={(label) => new Date(label).toLocaleString()}
        />
        <Line type="monotone" dataKey="value" stroke="#0284c7" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </MetricCard>
);

export const BarChartCard: React.FC<Omit<MetricCardProps, 'children'>> = (props) => (
    <MetricCard {...props}>
      <ResponsiveContainer>
        <BarChart data={props.history}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
            <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} className="text-xs" />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} className="text-xs" />
            <Tooltip
              contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  borderColor: '#334155',
                  color: '#f1f5f9'
              }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Bar dataKey="value" fill="#0284c7" />
        </BarChart>
      </ResponsiveContainer>
    </MetricCard>
);

const GaugeChart: React.FC<{ value: number, config: MetricConfig, thresholds: Thresholds }> = ({ value, config, thresholds }) => {
    const min = thresholds.criticalMin;
    const max = thresholds.criticalMax;
    const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    const status = getStatus(value, thresholds);

    const data = [{ value: percentage }, { value: 100 - percentage }];
    const colors = {
      [MetricStatus.Normal]: '#16a34a',
      [MetricStatus.Warning]: '#f59e0b',
      [MetricStatus.Critical]: '#dc2626',
    };

    return (
        <div className="relative w-full h-full">
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        cx="50%"
                        cy="70%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="60%"
                        outerRadius="100%"
                        paddingAngle={0}
                        stroke="none"
                    >
                        <Cell fill={colors[status]} />
                        <Cell fill="#334155" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                <div className="text-xs text-gray-400">Min: {min} / Max: {max}</div>
            </div>
        </div>
    );
};

export const GaugeChartCard: React.FC<Omit<MetricCardProps, 'children'>> = (props) => (
    <MetricCard {...props}>
        <GaugeChart value={props.latestData?.value ?? ((props.config.scaleLow + props.config.scaleHigh) / 2)} config={props.config} thresholds={props.thresholds} />
    </MetricCard>
);
