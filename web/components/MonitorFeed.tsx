'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { RefreshCw, Search, CheckSquare, Square, X, Calendar } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import StatusBadge from './StatusBadge';
import ReplyModal from './ReplyModal';
import { useTaskStream } from '../hooks/useTaskStream';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const STATUS_OPTIONS = ['Completed', 'Not Done', 'Pending', 'Cancelled', 'Acknowledged', 'Assigned', 'Rescheduled'];

interface MonitorTask {
    _id: string;
    'Candidate Name'?: string;
    candidateName?: string;
    status: string;
    subject?: string;
    receivedDateTime?: string;
    date?: string;
    'Date of Interview'?: string;
    dateOfInterview?: string;
}

export default function MonitorFeed() {
    const { tasks, loading, error, refresh: fetchTasks, setTasks } = useTaskStream<MonitorTask>('/api/validations');
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

    const [statusFilter, setStatusFilter] = useState('All');

    // Filter Logic
    const filteredTasks = tasks.filter(task => {
        // 1. Search Query
        const matchesSearch = (task['Candidate Name'] || task.candidateName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.subject?.toLowerCase().includes(searchQuery.toLowerCase());

        // 2. Status Dropdown Filter
        const matchesStatusFilter = statusFilter === 'All' || task.status === statusFilter;

        return matchesSearch && matchesStatusFilter;
    });

    useEffect(() => { setPage(1); }, [searchQuery, statusFilter]);

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

    // Reply Modal State
    const [selectedTask, setSelectedTask] = useState<MonitorTask | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = (task: MonitorTask) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-24 relative">
            <ReplyModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedTask(null); }}
                replies={(selectedTask as any)?.replies || []}
                taskTitle={selectedTask ? (selectedTask['Candidate Name'] || selectedTask.candidateName || 'Unknown') : ''}
                currentStatus={selectedTask?.status}
                onUpdateStatus={(newStatus) => selectedTask && handleUpdateStatus(selectedTask._id, newStatus)}
            />

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">Task Monitor</h2>
                    <p className="text-slate-400 mt-1">Manage and track interview tasks.</p>
                </div>
                <button onClick={fetchTasks} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 font-medium text-slate-200 transition-colors">
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="glass-card rounded-2xl p-4 mb-8 flex items-center gap-4">
                <button onClick={toggleSelectAll} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
                    {isAllSelected ? <CheckSquare className="text-purple-400" /> : isIndeterminate ? <CheckSquare className="text-purple-400/50" /> : <Square />}
                </button>
                <Search className="text-slate-400" />
                <input
                    type="text"
                    placeholder="Search tasks..."
                    className="flex-1 outline-none text-white placeholder-slate-500 bg-transparent"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />

                {/* Status Filter */}
                <div className="border-l border-white/10 pl-4 ml-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer hover:text-white transition-colors [&>option]:bg-slate-900"
                    >
                        <option value="All">All Status</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <div className="mt-0.5">
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-red-200">Failed to load tasks</h3>
                        <p className="text-sm text-red-300/80 mt-1">{error}</p>
                        <button
                            onClick={fetchTasks}
                            className="mt-2 text-sm font-medium text-red-300 hover:text-white underline"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredTasks.length === 0 && (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4 border border-white/10">
                        <CheckSquare className="text-slate-400" size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-white">No tasks found</h3>
                    <p className="text-slate-400 mt-1">
                        {searchQuery ? "Try adjusting your search query" : "No validation tasks available"}
                    </p>
                </div>
            )}

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {displayedTasks.map(task => (
                        <motion.div
                            key={task._id}
                            layoutId={task._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                                "glass-card rounded-xl p-6 flex items-center gap-4 group cursor-pointer hover:bg-white/5 transition-colors",
                                selectedIds.has(task._id) ? "border-purple-500/50 bg-purple-500/5" : ""
                            )}
                            onClick={() => openModal(task)}
                        >
                            <div onClick={(e) => { e.stopPropagation(); toggleSelect(task._id); }} className="cursor-pointer">
                                {selectedIds.has(task._id) ? <CheckSquare className="text-purple-400" /> : <Square className="text-slate-500 group-hover:text-slate-300 transition-colors" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-200 truncate">{task['Candidate Name'] || task.candidateName || task.subject || 'Untitled Task'}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                    <Calendar size={14} /> {task.receivedDateTime || task['Date of Interview'] || task.date || task.dateOfInterview || 'No Date'}
                                </div>
                            </div>
                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                <StatusBadge status={task.status} onChange={(s) => handleUpdateStatus(task._id, s)} disabled={false} />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {displayedTasks.length < filteredTasks.length && <div ref={ref} className="py-8 flex justify-center"><RefreshCw className="animate-spin text-purple-400" /></div>}
            </div>

            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50">
                        <div className="flex items-center gap-3 border-r border-slate-700 pr-4">
                            <span className="bg-purple-600 text-xs font-bold px-2 py-1 rounded-full">{selectedIds.size}</span>
                            <span className="text-sm">Selected</span>
                            <button onClick={() => setSelectedIds(new Set())} className="ml-1 hover:text-purple-300 transition-colors"><X size={16} /></button>
                        </div>
                        <select onChange={e => { if (e.target.value) handleBulkUpdate(e.target.value) }} disabled={isBulkUpdating} className="bg-slate-800 text-white text-sm rounded-lg p-2 border border-slate-700 focus:border-purple-500 outline-none" defaultValue="">
                            <option value="" disabled>Set Status</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
