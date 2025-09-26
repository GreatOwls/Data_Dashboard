

export interface DataPoint {
  time: number;
  value: number;
}

export type MetricId = string;

export enum MetricStatus {
  Normal = 'normal',
  Warning = 'warning',
  Critical = 'critical',
}

export interface MetricConfig {
  id: MetricId;
  name: string;
  unit: string;
  decimalPoint: number;
  scaleLow: number;
  scaleHigh: number;
  historySize: number;
  enabled: boolean;
  slaveId: number;
  registerType: 'Holding' | 'Input';
  address: number;
  chartType: 'Line' | 'Bar' | 'Gauge';
}

export interface Thresholds {
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
}

export type Settings = Record<MetricId, Thresholds>;

export interface Alert {
  id: number;
  metricId: MetricId;
  metricName: string;
  message: string;
  status: MetricStatus;
}