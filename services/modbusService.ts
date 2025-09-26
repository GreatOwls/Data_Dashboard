import { type MetricConfig, type DataPoint, type MetricId } from '../types.ts';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class ModbusService {
    private status: ConnectionStatus = 'disconnected';
    private ip: string = '';
    private port: number = 502;

    connect = (ip: string, port: number): Promise<void> => {
        this.status = 'connecting';
        this.ip = ip;
        this.port = port;
        
        console.log(`Attempting to connect to Modbus server at ${ip}:${port}...`);
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate a 50% chance of connection failure for demonstration
                if (Math.random() > 0.5 || ip === '127.0.0.1') {
                    this.status = 'connected';
                    console.log('Modbus connection successful.');
                    resolve();
                } else {
                    this.status = 'error';
                    console.error('Modbus connection failed.');
                    reject(new Error('Failed to connect to Modbus server.'));
                }
            }, 1500); // Simulate network delay
        });
    }

    disconnect = (): Promise<void> => {
        return new Promise(resolve => {
            this.status = 'disconnected';
            console.log('Modbus connection closed.');
            resolve();
        });
    }

    getStatus = (): ConnectionStatus => {
        return this.status;
    }

    // Simulate reading data from the Modbus server
    readData = (
        sensors: MetricConfig[], 
        currentHistory: Record<MetricId, DataPoint[]>
    ): Promise<Record<MetricId, number>> => {
        if (this.status !== 'connected') {
            return Promise.reject(new Error('Not connected to Modbus server.'));
        }

        return new Promise(resolve => {
            setTimeout(() => {
                const newValues: Record<MetricId, number> = {} as any;
                sensors.forEach(config => {
                    const history = currentHistory[config.id] || [];
                    const base = (config.scaleLow + config.scaleHigh) / 2;
                    const range = config.scaleHigh - config.scaleLow;
                    
                    const lastValue = history.length > 0 ? history[history.length - 1].value : base;
                    
                    const change = (Math.random() - 0.5) * (range / 5);
                    let newValue = lastValue + change;

                    // Keep value within the defined scale
                    if (newValue < config.scaleLow || newValue > config.scaleHigh) {
                        newValue = base;
                    }
                    
                    newValues[config.id] = parseFloat(newValue.toFixed(config.decimalPoint || 0));
                });
                // console.log("Read new values from Modbus:", newValues);
                resolve(newValues);
            }, 200); // Simulate read delay
        });
    }
}

export const modbusService = new ModbusService();