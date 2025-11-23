import React from 'react';
import clsx from 'clsx';

interface DataPoint {
    label: string;
    value: number;
    color?: string;
}

interface SimpleBarChartProps {
    data: DataPoint[];
    title?: string;
    height?: number;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
    data, 
    title, 
    height = 200 
}) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="w-full">
            {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
            
            <div className="relative" style={{ height: `${height}px` }}>
                <div className="absolute inset-0 flex items-end justify-around space-x-2">
                    {data.map((point, index) => {
                        const percentage = (point.value / maxValue) * 100;
                        
                        return (
                            <div key={index} className="flex flex-col items-center flex-1 group">
                                <div className="relative w-full flex items-end justify-center h-full">
                                    <div 
                                        className={clsx(
                                            "w-full max-w-[40px] rounded-t-md transition-all duration-500 ease-out",
                                            point.color || "bg-indigo-500",
                                            "group-hover:opacity-80"
                                        )}
                                        style={{ height: `${percentage}%` }}
                                    >
                                        {/* Tooltip */}
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                                            {point.label}: {point.value}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 font-medium truncate w-full text-center">
                                    {point.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Grid lines */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-0">
                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                        <div key={tick} className="w-full border-t border-gray-100 h-0" style={{ bottom: `${tick * 100}%` }}></div>
                    ))}
                </div>
            </div>
        </div>
    );
};
