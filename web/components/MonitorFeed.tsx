'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { RefreshCw, Search, CheckSquare, Square, X, Calendar } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import StatusBadge from './StatusBadge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const STATUS_OPTIONS = ['Pending', 'Completed', 'Rejected', 'In Progress', 'On Hold'];

export default function MonitorFeed() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Infinite Scroll
    const { ref, inView } = useInView({
        threshold: 0.5,
        delay: 100,
    });

    const fetchTasks = async () => {
        setLoading(true);
        setError('');
        // setTasks([]); // Don't clear on every fetch if implementing infinite scroll properly, but for refresh yes.
        // For simplicity, mimicking MismatchFeed behavior
        try {
            const res = await fetch('/api/validations');
            if (!res.ok) throw new Error('Failed to fetch tasks');
            const data = await res.json();
            setTasks(data); // Assuming non-stream for now based on 'api/validations' history not mentioning stream
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const prevTasks = [...tasks];
        setTasks(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t));

        try {
            const res = await fetch('/api/validations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (!res.ok) throw new Error('Failed to update');
        } catch (err) {
            console.error(err);
            setTasks(prevTasks);
            alert("Failed to update status");
        }
    };

    const handleBulkUpdate = async (newStatus: string) => {
        if (selectedIds.size === 0) return;
        setIsBulkUpdating(true);
        const idsToUpdate = Array.from(selectedIds);
        const prevTasks = [...tasks];
        setTasks(prev => prev.map(t => selectedIds.has(t._id) ? { ...t, status: newStatus } : t));

        try {
            const res = await fetch('/api/validations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToUpdate, status: newStatus })
            });
            if (!res.ok) throw new Error('Failed to bulk update');
            setSelectedIds(new Set());
        } catch (err) {
            console.error(err);
            setTasks(prevTasks);
            alert("Failed to bulk update");
        } finally {
            setIsBulkUpdating(false);
        }
    };

    // Filter
    const filteredTasks = tasks.filter(task =>
        task.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => { setPage(1); }, [searchQuery]);

    const displayedTasks = filteredTasks.slice(0, page * PAGE_SIZE);

    useEffect(() => {
        if (inView && displayedTasks.length < filteredTasks.length) {
            setPage(prev => prev + 1);
        }
    }, [inView, displayedTasks.length, filteredTasks.length]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === displayedTasks.length && displayedTasks.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(displayedTasks.map(t => t._id)));
    };

    const isAllSelected = displayedTasks.length > 0 && selectedIds.size === displayedTasks.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < displayedTasks.length;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Task Monitor</h2>
                    <p className="text-slate-500 mt-1">Manage and track interview tasks.</p>
                </div>
                <button onClick={fetchTasks} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600">
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-8 flex items-center gap-4">
                <button onClick={toggleSelectAll} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                    {isAllSelected ? <CheckSquare className="text-purple-600" /> : isIndeterminate ? <CheckSquare className="text-purple-400 opacity-50" /> : <Square />}
                </button>
                <Search className="text-slate-400" />
                <input type="text" placeholder="Search tasks..." className="flex-1 outline-none text-slate-900 placeholder-slate-400 bg-transparent" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {displayedTasks.map(task => (
                        <motion.div key={task._id} layoutId={task._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("bg-white rounded-xl border shadow-sm p-6 flex items-center gap-4", selectedIds.has(task._id) ? "border-purple-400 ring-1 ring-purple-400" : "border-slate-200")}>
                            <div onClick={() => toggleSelect(task._id)} className="cursor-pointer">
                                {selectedIds.has(task._id) ? <CheckSquare className="text-purple-600" /> : <Square className="text-slate-300" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-900 truncate">{task.candidateName || task.subject || 'Untitled Task'}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                    <Calendar size={14} /> {task.date || task.dateOfInterview || 'No Date'}
                                </div>
                            </div>
                            <div className="shrink-0">
                                <StatusBadge status={task.status} onChange={(s) => handleUpdateStatus(task._id, s)} disabled={false} />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {displayedTasks.length < filteredTasks.length && <div ref={ref} className="py-8 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>}
            </div>

            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50">
                        <div className="flex items-center gap-3 border-r border-slate-700 pr-4">
                            <span className="bg-purple-600 text-xs font-bold px-2 py-1 rounded-full">{selectedIds.size}</span>
                            <span className="text-sm">Selected</span>
                            <button onClick={() => setSelectedIds(new Set())} className="ml-1"><X size={16} /></button>
                        </div>
                        <select onChange={e => { if (e.target.value) handleBulkUpdate(e.target.value) }} disabled={isBulkUpdating} className="bg-slate-800 text-white text-sm rounded-lg p-2" defaultValue="">
                            <option value="" disabled>Set Status</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
