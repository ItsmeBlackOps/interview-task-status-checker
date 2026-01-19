'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, MapPin, Activity, PieChart } from 'lucide-react';

interface BranchStats {
    total: number;
    byStatus: Record<string, number>;
    byRound: Record<string, number>;
}

interface ReportsData {
    GGR: BranchStats;
    LKO: BranchStats;
    AHM: BranchStats;
    Other: BranchStats;
}

export default function ReportsFeed() {
    const [data, setData] = useState<ReportsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReports = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/reports');
            if (!res.ok) throw new Error('Failed to fetch reports');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    if (loading && !data) {
        return <div className="p-12 text-center text-slate-400 flex justify-center"><RefreshCw className="animate-spin" /></div>;
    }

    if (error) {
        return <div className="p-12 text-center text-red-500">Error: {error}</div>;
    }

    if (!data) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Analytics Reports</h2>
                    <p className="text-slate-500 mt-1">Real-time interview status distribution by branch.</p>
                </div>
                <button
                    onClick={fetchReports}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(data).map(([branch, stats], index) => {
                    if (stats.total === 0) return null; // Skip empty branches if preferred
                    return (
                        <motion.div
                            key={branch}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <MapPin size={18} className="text-purple-500" />
                                    {branch}
                                </h3>
                                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                                    {stats.total} Tasks
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Activity size={12} /> Status
                                    </h4>
                                    <div className="space-y-1">
                                        {Object.entries(stats.byStatus).map(([status, count]) => (
                                            <div key={status} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 truncate">{status}</span>
                                                <span className="font-medium text-slate-900">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 pt-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <PieChart size={12} /> Rounds
                                    </h4>
                                    <div className="space-y-1">
                                        {Object.entries(stats.byRound).slice(0, 5).map(([round, count]) => (
                                            <div key={round} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 truncate max-w-[120px]" title={round}>{round}</span>
                                                <span className="font-medium text-slate-900">{count}</span>
                                            </div>
                                        ))}
                                        {Object.keys(stats.byRound).length > 5 && (
                                            <div className="text-xs text-slate-400 italic mt-1">
                                                + {Object.keys(stats.byRound).length - 5} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
