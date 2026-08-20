import React, { useState, useEffect } from 'react';

const Dashboard = () => {
    // System Status State
    const [arduinoConnected, setArduinoConnected] = useState(true);
    const [ev3Connected, setEv3Connected] = useState(false);

    // Control State
    const [speedLimit, setSpeedLimit] = useState(50);
    const [autoMode, setAutoMode] = useState(false);

    // Telemetry State
    const [sensorData, setSensorData] = useState({ distance: 0, light: 0 });
    const [logs, setLogs] = useState(["System initialized...", "Waiting for I2C sync..."]);

    // Simulate incoming data
    useEffect(() => {
        const interval = setInterval(() => {
            if (arduinoConnected && ev3Connected) {
                setSensorData({
                    distance: Math.floor(Math.random() * 100),
                    light: Math.floor(Math.random() * 255)
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [arduinoConnected, ev3Connected]);

    const addLog = (message) => {
        setLogs(prev => [...prev.slice(-4), message]); // Keep last 5 logs
    };

    const handleCommand = (command) => {
        addLog(`Command sent: ${command}`);
        // Here you would fetch/post to your backend (e.g., Node.js API)
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">

            {/* 1. Header (System Status) */}
            <header className="flex justify-between items-center pb-6 border-b border-gray-700 mb-6">
                <h1 className="text-2xl font-bold tracking-wider">EV3-ARDUINO BRIDGE</h1>
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${arduinoConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm">Arduino API</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${ev3Connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm">EV3 I2C Bus</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* 2. Control Center (Left Panel) */}
                <section className="col-span-1 md:col-span-4 bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-lg font-semibold mb-6 text-gray-400 border-b border-gray-700 pb-2">CONTROLS</h2>

                    <div className="flex flex-col gap-4 mb-8">
                        <button
                            onClick={() => { setEv3Connected(true); handleCommand("INIT_I2C"); }}
                            className="bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition-colors">
                            Initialize System
                        </button>
                        <button
                            onClick={() => handleCommand("EMERGENCY_STOP")}
                            className="bg-red-600 hover:bg-red-500 py-3 rounded font-bold transition-colors">
                            Emergency Stop
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="flex justify-between text-sm mb-2">
                            <span>Motor Speed Limit</span>
                            <span className="text-blue-400">{speedLimit}%</span>
                        </label>
                        <input
                            type="range"
                            min="0" max="100"
                            value={speedLimit}
                            onChange={(e) => {
                                setSpeedLimit(e.target.value);
                                handleCommand(`SET_SPEED_${e.target.value}`);
                            }}
                            className="w-full accent-blue-500"
                        />
                    </div>

                    <div className="flex items-center justify-between bg-gray-700 p-4 rounded">
                        <span className="text-sm font-medium">Autonomous Mode</span>
                        <button
                            onClick={() => {
                                setAutoMode(!autoMode);
                                handleCommand(`MODE_${!autoMode ? 'AUTO' : 'MANUAL'}`);
                            }}
                            className={`px-4 py-2 rounded font-bold ${autoMode ? 'bg-green-500' : 'bg-gray-600'}`}>
                            {autoMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </section>

                {/* 3. Telemetry Deck (Right Panel) */}
                <section className="col-span-1 md:col-span-8 flex flex-col gap-6">

                    <h2 className="text-lg font-semibold text-gray-400 border-b border-gray-700 pb-2">TELEMETRY</h2>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-sm mb-2">Proximity Distance</span>
                            <span className="text-5xl font-mono text-green-400">{sensorData.distance} <span className="text-xl">cm</span></span>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-sm mb-2">Light Intensity</span>
                            <span className="text-5xl font-mono text-yellow-400">{sensorData.light}</span>
                        </div>
                    </div>

                    <div className="bg-black p-4 rounded-lg flex-grow border border-gray-700 font-mono text-sm text-green-500 overflow-hidden">
                        <div className="text-gray-500 mb-2 border-b border-gray-800 pb-1">RAW I2C PAYLOAD LOG</div>
                        {logs.map((log, index) => (
                            <div key={index}>{`> ${log}`}</div>
                        ))}
                    </div>

                </section>
            </div>
        </div>
    );
};

export default Dashboard;
