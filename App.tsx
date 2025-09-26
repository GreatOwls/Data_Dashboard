







import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChartCard, BarChartCard, GaugeChartCard } from './components/MetricCharts.tsx';
import { SunIcon, MoonIcon, SettingsIcon, DownloadIcon, BellIcon, XIcon, MenuIcon, AlertTriangleIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, LayoutDashboardIcon, TableCellsIcon, CogIcon } from './components/Icons.tsx';
import { type DataPoint, type MetricId, type Settings, type Alert, MetricStatus, type MetricConfig } from './types.ts';
import { INITIAL_METRIC_CONFIGS, INITIAL_SETTINGS, DATA_UPDATE_INTERVAL } from './constants.ts';
import { exportDataToCSV } from './services/csvExporter.ts';
import { DataTable } from './components/DataTable.tsx';
import { ConfigurationPage, type ConnectionStatus } from './components/ConfigurationPage.tsx';
import { modbusService } from './services/modbusService.ts';

type Page = 'dashboard' | 'table' | 'configuration';

// THEME MANAGEMENT
const useTheme = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
};

// DATA SERVICE & ALERT LOGIC HOOK
const useDataService = (
    metricConfigs: Record<MetricId, MetricConfig>,
    settings: Settings,
    isSoundOn: boolean,
    connectionStatus: ConnectionStatus,
    setDataHistory: React.Dispatch<React.SetStateAction<Record<MetricId, DataPoint[]>>>
) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    
    const alertSound = useMemo(() => typeof Audio !== "undefined" ? new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_5497f174e4.mp3?filename=notification-sound-7062.mp3') : undefined, []);

    const addAlert = useCallback((alert: Omit<Alert, 'id'>) => {
        setAlerts(prev => {
            const newAlert = { ...alert, id: Date.now() };
            if (isSoundOn && alertSound) {
                alertSound.play().catch(e => console.error("Error playing sound:", e));
            }
            return [newAlert, ...prev.slice(0, 4)];
        });
    }, [isSoundOn, alertSound]);

    useEffect(() => {
        if (connectionStatus !== 'connected') return;

        const interval = setInterval(async () => {
            // FIX: Add explicit type to the parameter of the filter function.
            const enabledSensors = Object.values(metricConfigs).filter((c: MetricConfig) => c.enabled);
            if (enabledSensors.length === 0) return;

            setDataHistory(currentHistory => {
                // Read data inside the setDataHistory updater to get the freshest state
                modbusService.readData(enabledSensors, currentHistory).then(newValues => {
                    const now = Date.now();
                    
                    setDataHistory(prevHistory => {
                        const updatedHistory = { ...prevHistory };

                        for (const metricId in newValues) {
                            const config = metricConfigs[metricId as MetricId];
                            if (!config) continue;

                            const newValue = newValues[metricId as MetricId];
                            const newDataPoint: DataPoint = { time: now, value: newValue };

                            updatedHistory[metricId as MetricId] = [...(updatedHistory[metricId as MetricId] || []), newDataPoint].slice(-config.historySize);
                            
                            // Check for alerts
                            const thresholds = settings[metricId as MetricId];
                            if (thresholds && (newValue < thresholds.criticalMin || newValue > thresholds.criticalMax)) {
                                addAlert({
                                    metricId: metricId as MetricId,
                                    metricName: config.name,
                                    message: `CRITICAL! Value is ${newValue.toFixed(2)}${config.unit}`,
                                    status: MetricStatus.Critical,
                                });
                            } else if (thresholds && (newValue < thresholds.warningMin || newValue > thresholds.warningMax)) {
                                addAlert({
                                    metricId: metricId as MetricId,
                                    metricName: config.name,
                                    message: `Warning. Value is ${newValue.toFixed(2)}${config.unit}`,
                                    status: MetricStatus.Warning,
                                });
                            }
                        }
                        return updatedHistory;
                    });
                }).catch(err => console.error("Failed to read Modbus data:", err));
                return currentHistory; // Return original state, async update will happen
            });

        }, DATA_UPDATE_INTERVAL);

        return () => clearInterval(interval);
    }, [addAlert, settings, connectionStatus, metricConfigs, setDataHistory]);


    const dismissAlert = (id: number) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    };

    return { alerts, dismissAlert };
};


// COMPONENTS
const Header: React.FC<{ theme: string; toggleTheme: () => void; onToggleSidebar: () => void; }> = ({ theme, toggleTheme, onToggleSidebar }) => {
  return (
    <header className="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text shadow-md p-4 flex justify-between items-center z-10">
       <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">
            <MenuIcon className="h-6 w-6"/>
        </button>
        <h1 className="text-xl font-bold">Real-Time Data Dashboard</h1>
       </div>
       <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg transition-colors">
        {theme === 'dark' ? <SunIcon className="h-6 w-6 text-yellow-400" /> : <MoonIcon className="h-6 w-6 text-slate-700" />}
       </button>
    </header>
  );
};

const Navigation: React.FC<{
    currentPage: Page;
    setPage: (page: Page) => void;
    isCollapsed: boolean;
}> = ({ currentPage, setPage, isCollapsed }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
        { id: 'table', label: 'Data Table', icon: TableCellsIcon },
        { id: 'configuration', label: 'Configuration', icon: CogIcon },
    ];

    return (
        <nav className={`border-b border-light-border dark:border-dark-border ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <ul className="space-y-2">
                {navItems.map(item => (
                    <li key={item.id}>
                        <button
                            onClick={() => setPage(item.id as Page)}
                            title={item.label}
                            className={`w-full flex items-center p-2 rounded-lg transition-colors ${
                                currentPage === item.id
                                    ? 'bg-primary text-white'
                                    : 'text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                        >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="ml-3">{item.label}</span>}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};


const SettingsPanel: React.FC<{
    settings: Settings;
    onSettingsChange: (metric: MetricId, field: keyof Settings[MetricId], value: number) => void;
    onExport: () => void;
    isSoundOn: boolean;
    onSoundToggle: () => void;
    isCollapsed: boolean;
    metricConfigs: Record<MetricId, MetricConfig>;
}> = ({ settings, onSettingsChange, onExport, isSoundOn, onSoundToggle, isCollapsed, metricConfigs }) => {
    // FIX: Add explicit type to the parameter of the filter function to prevent properties of 'config' from being treated as 'unknown'.
    const enabledMetrics = Object.values(metricConfigs).filter((m: MetricConfig) => m.enabled);
    return (
        <div className={`space-y-6 text-light-text dark:text-dark-text transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <div>
                <h3 className={`text-lg font-semibold mb-2 flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
                    <SettingsIcon className="h-5 w-5 flex-shrink-0"/>
                    {!isCollapsed && <span>Thresholds</span>}
                </h3>
                {!isCollapsed && (
                    <div className="space-y-4">
                        {enabledMetrics.length > 0 ? enabledMetrics.map(config => (
                            <div key={config.id} className="p-3 bg-light-bg dark:bg-dark-bg/50 rounded-lg">
                                <h4 className="font-bold mb-2">{config.name}</h4>
                                <div className="text-xs space-y-2">
                                    {(['criticalMin', 'warningMin', 'warningMax', 'criticalMax'] as const).map(key => (
                                        <div key={key} className="flex flex-col">
                                            <label htmlFor={`${config.id}-${key}`} className="capitalize mb-1 opacity-80">{key.replace('Min', ' Min').replace('Max', ' Max')}</label>
                                            <input
                                                type="number"
                                                id={`${config.id}-${key}`}
                                                value={settings[config.id]?.[key] ?? 0}
                                                onChange={(e) => onSettingsChange(config.id, key, parseFloat(e.target.value))}
                                                className="w-full bg-light-card dark:bg-dark-bg border border-light-border dark:border-dark-border rounded px-2 py-1"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )) : <p className="text-xs text-gray-400 text-center">No sensors enabled.</p>}
                    </div>
                )}
            </div>
            <div>
                {!isCollapsed && (
                  <h3 className="text-lg font-semibold mb-2">Actions</h3>
                )}
                <div className="space-y-2">
                    <button
                        onClick={onSoundToggle}
                        title={isSoundOn ? 'Disable Sound' : 'Enable Sound'}
                        className={`w-full flex items-center p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <BellIcon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-2">{isSoundOn ? 'Disable Sound' : 'Enable Sound'}</span>}
                    </button>
                    <button
                        onClick={onExport}
                        title="Download CSV"
                        className={`w-full flex items-center p-2 rounded-lg bg-success/20 text-success hover:bg-success hover:text-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <DownloadIcon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-2">Download CSV</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Sidebar: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}> = ({ isOpen, onClose, children, isCollapsed, onToggleCollapse }) => {
    return (
        <>
            <aside className={`fixed top-0 left-0 h-full bg-light-card dark:bg-dark-card shadow-lg z-30 flex flex-col
                transition-all duration-300 ease-in-out 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                lg:translate-x-0 lg:relative lg:flex-shrink-0 
                ${isCollapsed ? 'w-20' : 'w-72'}`}>

                <div className="flex-1 h-full overflow-y-auto overflow-x-hidden">
                    {children}
                </div>

                <div className="hidden lg:block p-2 border-t border-light-border dark:border-dark-border">
                    <button
                        onClick={onToggleCollapse}
                        className="w-full p-2 flex justify-center items-center rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
                        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {isCollapsed
                            ? <ChevronDoubleRightIcon className="h-6 w-6 text-gray-500" />
                            : <ChevronDoubleLeftIcon className="h-6 w-6 text-gray-500" />}
                    </button>
                </div>
            </aside>
            {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/50 z-20 lg:hidden"></div>}
        </>
    );
};


const Toast: React.FC<{ alert: Alert, onDismiss: (id: number) => void }> = ({ alert, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            const exitTimer = setTimeout(() => onDismiss(alert.id), 500);
            return () => clearTimeout(exitTimer);
        }, 5000);

        return () => clearTimeout(timer);
    }, [alert.id, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(alert.id), 500);
    };

    const statusClasses = {
        [MetricStatus.Warning]: "bg-warning/80 border-warning",
        [MetricStatus.Critical]: "bg-danger/80 border-danger",
        [MetricStatus.Normal]: "bg-primary/80 border-primary"
    };

    return (
        <div className={`w-80 p-4 rounded-lg shadow-xl text-white backdrop-blur-md border-l-4 ${statusClasses[alert.status]} ${isExiting ? 'animate-fade-out' : 'animate-slide-in'}`}>
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                    <AlertTriangleIcon className="h-6 w-6" />
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-medium">{alert.metricName} Alert</p>
                    <p className="mt-1 text-sm opacity-90">{alert.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={handleDismiss} className="inline-flex rounded-md text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ToastContainer: React.FC<{ alerts: Alert[]; onDismiss: (id: number) => void }> = ({ alerts, onDismiss }) => {
    return (
        <div className="fixed top-20 right-4 z-50 space-y-2">
            {alerts.map(alert => (
                <Toast key={alert.id} alert={alert} onDismiss={onDismiss} />
            ))}
        </div>
    );
};


// MAIN APP
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [metricConfigs, setMetricConfigs] = useState<Record<MetricId, MetricConfig>>(INITIAL_METRIC_CONFIGS);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [dataHistory, setDataHistory] = useState<Record<MetricId, DataPoint[]>>(() => {
     return Object.keys(INITIAL_METRIC_CONFIGS).reduce((acc, key) => {
        acc[key as MetricId] = [];
        return acc;
    }, {} as Record<MetricId, DataPoint[]>);
  });
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const { alerts, dismissAlert } = useDataService(metricConfigs, settings, isSoundOn, connectionStatus, setDataHistory);

  const handleSettingsChange = (metric: MetricId, field: keyof Settings[MetricId], value: number) => {
    setSettings(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [field]: value,
      },
    }));
  };

  const handleChartTypeChange = (metricId: MetricId, newType: 'Line' | 'Bar' | 'Gauge') => {
    setMetricConfigs(prev => ({
      ...prev,
      [metricId]: {
        ...prev[metricId],
        chartType: newType,
      },
    }));
  };
  
  const handleAddSensor = () => {
    const newId = `sensor-${Date.now()}`;
    const newSensorConfig: MetricConfig = {
      id: newId,
      name: 'New Sensor',
      unit: 'N/A',
      historySize: 50,
      enabled: false,
      slaveId: 3,
      registerType: 'Holding',
      address: 3001,
      chartType: 'Line',
      decimalPoint: 1,
      scaleLow: 0,
      scaleHigh: 100,
    };
    const newSensorSettings = {
      warningMin: 10, warningMax: 90,
      criticalMin: 0, criticalMax: 100,
    };
    
    setMetricConfigs(prev => ({ ...prev, [newId]: newSensorConfig }));
    setSettings(prev => ({ ...prev, [newId]: newSensorSettings }));
    setDataHistory(prev => ({ ...prev, [newId]: [] }));
  };
  
  const handleDeleteSensor = (metricId: MetricId) => {
      if (!window.confirm(`Are you sure you want to delete "${metricConfigs[metricId].name}"? This action cannot be undone.`)) {
          return;
      }
      
      setMetricConfigs(prev => {
          const newState = { ...prev };
          delete newState[metricId];
          return newState;
      });
      setSettings(prev => {
          const newState = { ...prev };
          delete newState[metricId];
          return newState;
      });
      setDataHistory(prev => {
          const newState = { ...prev };
          delete newState[metricId];
          return newState;
      });
  };

  const handleExport = () => exportDataToCSV(dataHistory);
  const handleSoundToggle = () => setIsSoundOn(prev => !prev);
  const handleToggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleToggleSidebarCollapse = () => setIsSidebarCollapsed(prev => !prev);

  const renderDashboard = () => {
    // FIX: Add explicit type to the parameter of the filter function.
    const enabledMetrics = Object.values(metricConfigs).filter((m: MetricConfig) => m.enabled);
    if (enabledMetrics.length === 0) {
        return <div className="text-center text-gray-500 pt-10">No sensors enabled. Visit the Configuration page to get started.</div>
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {enabledMetrics.map(config => {
                const history = dataHistory[config.id] || [];
                const latestData = history[history.length - 1];
                const chartProps = {
                    key: config.id,
                    config: config,
                    history: history,
                    latestData: latestData,
                    thresholds: settings[config.id],
                    onChartTypeChange: (newType: 'Line' | 'Bar' | 'Gauge') => handleChartTypeChange(config.id, newType),
                };
                
                switch (config.chartType) {
                    case 'Line':
                        return <LineChartCard {...chartProps} />;
                    case 'Bar':
                        return <BarChartCard {...chartProps} />;
                    case 'Gauge':
                        return <GaugeChartCard {...chartProps} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
  };

  const renderContent = () => {
      switch(currentPage) {
          case 'dashboard':
              return renderDashboard();
          case 'table':
              return <DataTable metricConfigs={metricConfigs} dataHistory={dataHistory} settings={settings} />;
          case 'configuration':
              return <ConfigurationPage 
                        metricConfigs={metricConfigs} 
                        setMetricConfigs={setMetricConfigs} 
                        connectionStatus={connectionStatus}
                        setConnectionStatus={setConnectionStatus}
                        onAddSensor={handleAddSensor}
                        onDeleteSensor={handleDeleteSensor}
                      />;
          default:
              return null;
      }
  }

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
       >
        <Navigation 
            currentPage={currentPage}
            setPage={setCurrentPage}
            isCollapsed={isSidebarCollapsed}
        />
        <SettingsPanel
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onExport={handleExport}
            isSoundOn={isSoundOn}
            onSoundToggle={handleSoundToggle}
            isCollapsed={isSidebarCollapsed}
            metricConfigs={metricConfigs}
        />
      </Sidebar>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header theme={theme} toggleTheme={toggleTheme} onToggleSidebar={handleToggleSidebar}/>
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {renderContent()}
        </main>
      </div>

      <ToastContainer alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}