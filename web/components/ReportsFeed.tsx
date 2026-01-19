'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, Calendar, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


// Helper for classes
function cn(...inputs: (string | undefined | null | boolean)[]) {
    return twMerge(clsx(inputs));
}

// New Data Structure Types
type StatusCounts = Record<string, number>;
type RoundMap = Record<string, StatusCounts>;
type BranchMap = Record<string, RoundMap>;

// Status Badge Helper (Inline for Report)
const STATUS_COLORS: Record<string, string> = {
    'Completed': 'bg-green-500/10 text-green-500 border-green-500/20',
    'Not Done': 'bg-red-500/10 text-red-500 border-red-500/20',
    'Pending': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'Cancelled': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Acknowledged': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Assigned': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'Rescheduled': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

const DEFAULT_COLOR = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

export default function ReportsFeed() {
    const [data, setData] = useState<BranchMap | null>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [dateField, setDateField] = useState<'interview' | 'received'>('interview');
    const [statusFilter, setStatusFilter] = useState('All');

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('dateField', dateField);

            const res = await fetch(`/api/reports?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white">Reports</h2>
                    <p className="text-sm text-slate-400">Task statistics by Branch and Round</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Toggle */}
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setDateField('interview')}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", dateField === 'interview' ? "bg-purple-500 text-white" : "text-slate-400 hover:text-slate-300")}
                        >
                            Interview Date
                        </button>
                        <button
                            onClick={() => setDateField('received')}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", dateField === 'received' ? "bg-purple-500 text-white" : "text-slate-400 hover:text-slate-300")}
                        >
                            Received Date
                        </button>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-800/50 border border-white/5 text-xs text-slate-300 rounded-lg px-2 py-2 outline-none hover:text-white transition-colors cursor-pointer [&>option]:bg-slate-900"
                    >
                        <option value="All">All Statuses</option>
                        {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-white/5">
                        <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={cn("bg-transparent border-none text-xs text-white placeholder-slate-500 focus:ring-0 outline-none", "color-scheme-dark")}
                        />
                        <span className="text-slate-600">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={cn("bg-transparent border-none text-xs text-white placeholder-slate-500 focus:ring-0 outline-none", "color-scheme-dark")}
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {
                loading && !data ? (
                    <div className="text-center py-12 text-slate-500">Loading reports...</div>
                ) : data ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {Object.entries(data).map(([branch, rounds]) => (
                            <motion.div
                                key={branch}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card rounded-xl p-6 border border-white/5"
                            >
                                <h3 className="text-lg font-medium text-white mb-4 border-b border-white/5 pb-2 flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-purple-400" />
                                        {branch}
                                    </span>
                                    <span className="text-xs font-normal text-slate-500 bg-white/5 px-2 py-1 rounded-full">
                                        {Object.values(rounds).reduce((acc, statusMap) => acc + Object.values(statusMap).reduce((a, b) => a + b, 0), 0)} Tasks
                                    </span>
                                </h3>

                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.keys(rounds).length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">No data available.</p>
                                    ) : (
                                        Object.entries(rounds)
                                            .sort((a, b) => a[0].localeCompare(b[0])) // Sort rounds alphabetically
                                            .map(([round, statusMap]) => {
                                                // Handle Status Filter
                                                const filteredStatusMap = Object.entries(statusMap).filter(([s]) => statusFilter === 'All' || s === statusFilter);
                                                if (filteredStatusMap.length === 0) return null;

                                                return (
                                                    <div key={round} className="bg-slate-900/40 rounded-lg p-3 border border-white/5">
                                                        <div className="text-sm font-medium text-slate-300 mb-2 border-b border-white/5 pb-1">{round}</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filteredStatusMap.map(([status, count]) => (
                                                                <div
                                                                    key={status}
                                                                    className={cn(
                                                                        "flex items-center gap-1.5 px-2 py-1 rounded text-[11px] border",
                                                                        STATUS_COLORS[status] || DEFAULT_COLOR
                                                                    )}
                                                                >
                                                                    <span>{status}</span>
                                                                    <span className="font-bold opacity-80 border-l border-current pl-1.5 ml-0.5">{count}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500">No data found.</div>
                )
            }
        </div >
    );
}

