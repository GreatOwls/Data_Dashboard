import { type MetricConfig, type Settings, type MetricId } from './types.ts';

export const INITIAL_METRIC_CONFIGS: Record<MetricId, MetricConfig> = {
  'temperature': {
    id: 'temperature',
    name: 'Temperature',
    unit: '°C',
    historySize: 50,
    enabled: true,
    slaveId: 1,
    registerType: 'Holding',
    address: 1001,
    chartType: 'Line',
    decimalPoint: 1,
    scaleLow: -10.0,
    scaleHigh: 50.0,
  },
  'pressure': {
    id: 'pressure',
    name: 'Pressure',
    unit: 'kPa',
    historySize: 50,
    enabled: true,
    slaveId: 1,
    registerType: 'Holding',
    address: 1002,
    chartType: 'Bar',
    decimalPoint: 1,
    scaleLow: 0.0,
    scaleHigh: 150.0,
  },
  'humidity': {
    id: 'humidity',
    name: 'Humidity',
    unit: '%',
    historySize: 50,
    enabled: true,
    slaveId: 2,
    registerType: 'Input',
    address: 2001,
    chartType: 'Gauge',
    decimalPoint: 0,
    scaleLow: 0,
    scaleHigh: 100,
  },
  'vibration': {
    id: 'vibration',
    name: 'Vibration',
    unit: 'm/s²',
    historySize: 50,
    enabled: false,
    slaveId: 2,
    registerType: 'Input',
    address: 2002,
    chartType: 'Line',
    decimalPoint: 2,
    scaleLow: 0.0,
    scaleHigh: 1.5,
  },
};

export const INITIAL_SETTINGS: Settings = {
  'temperature': {
    warningMin: 0,
    warningMax: 40,
    criticalMin: -10,
    criticalMax: 50,
  },
  'pressure': {
    warningMin: 98,
    warningMax: 104,
    criticalMin: 95,
    criticalMax: 107,
  },
  'humidity': {
    warningMin: 30,
    warningMax: 60,
    criticalMin: 20,
    criticalMax: 70,
  },
  'vibration': {
    warningMin: 0.2,
    warningMax: 0.8,
    criticalMin: 0.1,
    criticalMax: 1.0,
  },
};

export const DATA_UPDATE_INTERVAL = 2000; // in milliseconds