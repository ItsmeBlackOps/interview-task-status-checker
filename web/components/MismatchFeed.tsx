'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { RefreshCw, Search, AlertCircle, ArrowRight, Clipboard, ClipboardCheck, ChevronDown, Calendar, CheckSquare, Square, X, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import StatusBadge from './StatusBadge';
import ReplyModal from './ReplyModal';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const ALLOWED_ROUNDS = [
    "1st Round", "2nd Round", "3rd Round", "4th Round", "Screening",
    "On Demand or AI Interview", "5th Round", "Technical Round",
    "Coding Round", "Final Round", "Loop Round"
];

interface MismatchTask {
    _id: string;
    'Candidate Name'?: string;
    candidateName?: string;
    status: string;
    currentRound?: string;
    'Interview Round'?: string;
    subject?: string;
    allowed?: boolean;
    reason?: string;
    'Date of Interview'?: string;
    dateOfInterview?: string;
    replies?: { sender: string; date: string; body?: string; snippet?: string;[key: string]: unknown }[];
    actualRound?: string | null;
}

export default function MismatchFeed() {
    const [tasks, setTasks] = useState<MismatchTask[]>([]);
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

    // Reply Modal
    const [selectedTask, setSelectedTask] = useState<MismatchTask | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Confirmation State
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

    // Streaming Logic
    const fetchMismatches = async () => {
        setLoading(true);
        setError('');
        setTasks([]);
        setPage(1);
        setSelectedIds(new Set()); // Clear selection on refresh
        try {
            const res = await fetch('/api/mismatches');
            if (!res.ok) throw new Error('Failed to fetch mismatches');
            if (!res.body) throw new Error('No response body');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                const newTasks: MismatchTask[] = [];
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const task = JSON.parse(line);
                            newTasks.push(task);
                        } catch {
                            console.warn('Failed to parse NDJSON line');
                        }
                    }
                }

                if (newTasks.length > 0) {
                    setTasks(prev => [...prev, ...newTasks]);
                }
            }
            // Process any remaining buffer
            if (buffer.trim()) {
                try {
                    const task = JSON.parse(buffer);
                    setTasks(prev => [...prev, task]);
                } catch { }
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(fetchMismatches, 100);
        return () => clearTimeout(t);
    }, []);



    // Single Update
    const handleUpdateRound = async (id: string, newRound: string) => {
        // Optimistic Update
        const prevTasks = [...tasks];

        // Update local state
        setTasks(prev => prev.map(t =>
            t._id === id ? { ...t, currentRound: newRound, reason: 'Updated - Refresh to clear' } : t
        ));

        // If modal is open for this task, update it too
        if (selectedTask && selectedTask._id === id) {
            setSelectedTask((prev) => prev ? ({ ...prev, currentRound: newRound }) : null);
        }

        try {
            const res = await fetch('/api/mismatches', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, actualRound: newRound })
            });

            if (!res.ok) throw new Error('Failed to update');

        } catch (err) {
            console.error(err);
            setTasks(prevTasks); // Revert
            if (selectedTask && selectedTask._id === id) {
                setSelectedTask(prevTasks.find(t => t._id === id) || null);
            }
            alert("Failed to update round.");
        }
    };

    // Remove Round -> Open Confirmation
    const handleRemoveRound = (id: string) => {
        setDeleteConfirmationId(id);
    };

    // Actual Logic to Delete
    const confirmRemoveRound = async () => {
        if (!deleteConfirmationId) return;
        const id = deleteConfirmationId;
        setDeleteConfirmationId(null); // Close modal

        // Optimistic Update
        const prevTasks = [...tasks];
        setTasks(prev => prev.filter(t => t._id !== id));

        try {
            const res = await fetch('/api/mismatches', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, actualRound: null })
            });

            if (!res.ok) throw new Error('Failed to remove round');

        } catch (err) {
            console.error(err);
            setTasks(prevTasks); // Revert
            alert("Failed to remove round.");
        }
    };

    // Bulk Update
    const handleBulkUpdate = async (newRound: string) => {
        if (selectedIds.size === 0) return;
        setIsBulkUpdating(true);
        const idsToUpdate = Array.from(selectedIds);

        // Optimistic Update
        const prevTasks = [...tasks];
        setTasks(prev => prev.map(t =>
            selectedIds.has(t._id) ? { ...t, currentRound: newRound, reason: 'Bulk Updated - Refresh to clear' } : t
        ));

        try {
            const res = await fetch('/api/mismatches', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToUpdate, actualRound: newRound })
            });

            if (!res.ok) throw new Error('Failed to bulk update');
            setSelectedIds(new Set()); // Clear selection on success

        } catch (err) {
            console.error(err);
            setTasks(prevTasks); // Revert
            alert("Failed to bulk update items.");
        } finally {
            setIsBulkUpdating(false);
        }
    }


    // Filter
    const filteredTasks = tasks.filter(task =>
        (task['Candidate Name'] || task.candidateName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Initial Filter Effect
    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    // Pagination Logic
    const displayedTasks = filteredTasks.slice(0, page * PAGE_SIZE);

    // Infinite Scroll Effect
    useEffect(() => {
        if (inView && displayedTasks.length < filteredTasks.length) {
            setPage(prev => prev + 1);
        }
    }, [inView, displayedTasks.length, filteredTasks.length]);

    // Open Modal Wrapper
    const openModal = (task: MismatchTask) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    // Selection Logic
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === displayedTasks.length && displayedTasks.length > 0) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set(displayedTasks.map(t => t._id));
            setSelectedIds(newSet);
        }
    };

    const isAllSelected = displayedTasks.length > 0 && selectedIds.size === displayedTasks.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < displayedTasks.length;


    return (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-24 relative">
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmationId && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirmationId(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl p-6 overflow-hidden ring-1 ring-white/10"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                                    <Trash2 className="text-red-400" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Remove Round?</h3>
                                <p className="text-slate-400 text-sm mb-6">
                                    Are you sure you want to remove the &apos;actualRound&apos; key? This will revert the task to its calculated value.
                                </p>
                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        onClick={() => setDeleteConfirmationId(null)}
                                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-colors border border-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmRemoveRound}
                                        className="flex-1 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-900/20"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ReplyModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedTask(null); }}
                replies={selectedTask?.replies || []}
                taskTitle={selectedTask ? (selectedTask['Candidate Name'] || selectedTask.candidateName || 'Unknown') : ''}
                currentInterviewRound={selectedTask?.currentRound} // Pass current round
                taskId={selectedTask?._id}
                onUpdateRound={(newRound) => selectedTask && handleUpdateRound(selectedTask._id, newRound)}
            />

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">Round Mismatches</h2>
                    <p className="text-slate-400 mt-1">
                        Detected {filteredTasks.length} tasks where the extracted round doesn&apos;t match the database.
                    </p>
                </div>
                <button
                    onClick={fetchMismatches}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 font-medium text-slate-200 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="glass-card rounded-2xl p-4 mb-8 flex items-center gap-4">
                {/* Select All Checkbox */}
                <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
                    title="Select All Visible"
                >
                    {isAllSelected ? (
                        <CheckSquare className="text-purple-400" />
                    ) : isIndeterminate ? (
                        <CheckSquare className="text-purple-400/50" />
                    ) : (
                        <Square />
                    )}
                </button>

                <Search className="text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by candidate name..."
                    className="flex-1 outline-none text-white placeholder-slate-500 bg-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>


            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <div className="mt-0.5">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-red-200">Failed to load mismatches</h3>
                        <p className="text-sm text-red-300/80 mt-1">{error}</p>
                        <button
                            onClick={fetchMismatches}
                            className="mt-2 text-sm font-medium text-red-300 hover:text-white underline"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {displayedTasks.map((task) => {
                        const isSelected = selectedIds.has(task._id);
                        return (
                            <motion.div
                                key={task._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                layoutId={task._id}
                                className={cn(
                                    "glass-card rounded-xl overflow-hidden hover:bg-white/10 transition-colors relative cursor-pointer group border-none",
                                    isSelected ? "ring-2 ring-purple-500/50 bg-purple-500/5" : ""
                                )}
                                onClick={() => openModal(task)}
                            >
                                <div className="flex items-center gap-0 p-0 h-32">

                                    {/* Selection Checkbox (Absolute mostly) */}
                                    <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => toggleSelect(task._id)}
                                            className="text-slate-500 hover:text-purple-400 transition-colors"
                                        >
                                            {isSelected ? <CheckSquare className="text-purple-400 fill-purple-900/20" /> : <Square className="hover:text-white" />}
                                        </button>
                                    </div>

                                    {/* Left Stripe */}
                                    <div className={cn(
                                        "w-1.5 self-stretch shrink-0",
                                        task.allowed && "bg-orange-500", // Mismatch but valid value
                                        !task.allowed && "bg-yellow-500" // Invalid value
                                    )} />

                                    {/* Main Content Area */}
                                    <div className="flex-1 p-6 pl-12 flex flex-col justify-center min-w-0"> {/* pl-12 for checkbox space */}
                                        <div className="flex items-center gap-3 mb-2" onClick={(e) => e.stopPropagation()}>
                                            <h3 className="text-lg font-bold text-slate-100 truncate">
                                                {task['Candidate Name'] || task.candidateName || 'Unknown Candidate'}
                                            </h3>
                                            <StatusBadge status={task.status} onChange={() => { }} disabled={true} />
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-400">

                                            {/* Mismatch Label */}
                                            <div className={cn(
                                                "flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider",
                                                task.allowed ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                            )}>
                                                <AlertCircle size={12} />
                                                Mismatch
                                            </div>

                                            <div className="h-4 w-px bg-white/10" />

                                            {/* Copy Subject Button */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(task.subject || "No Subject");
                                                    }}
                                                    title={`Copy Subject: ${task.subject || "No Subject"}`}
                                                    className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                >
                                                    <Clipboard size={16} />
                                                </button>
                                            </div>

                                            {/* Arrow Hint (Visual cue) */}
                                            <div className="hidden sm:flex text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronDown className="-rotate-90" size={20} />
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                                            {(task['Date of Interview'] || task.dateOfInterview) && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {task['Date of Interview'] || task.dateOfInterview}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Mismatch Visualization & Action */}
                                    <div
                                        className="w-[45%] bg-black/20 self-stretch border-l border-white/5 p-6 flex flex-col justify-center"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between gap-4">

                                            {/* Extracted Side */}
                                            <div className="flex-1 text-right min-w-0" onClick={() => openModal(task)}>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Extracted</div>
                                                {task.currentRound ? (
                                                    <div className="flex flex-col items-end">
                                                        <div className="font-bold text-slate-300 truncate" title={task.currentRound}>
                                                            {task.currentRound}
                                                        </div>
                                                        {/* Remove Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveRound(task._id);
                                                            }}
                                                            className="mt-2 text-xs flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors ml-auto relative z-10 p-1 hover:bg-red-500/10 rounded"
                                                            title="Remove 'actualRound' key"
                                                        >
                                                            <Trash2 size={12} />
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="font-bold text-red-400 italic text-sm">
                                                        Not Found
                                                    </div>
                                                )}
                                            </div>

                                            {/* Arrow */}
                                            <ArrowRight className="text-slate-600 shrink-0" size={20} />

                                            {/* Current / Selector Side */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current</div>
                                                {/* Dropdown for quick fix */}
                                                <select
                                                    value={task.currentRound && ALLOWED_ROUNDS.includes(task.currentRound) ? task.currentRound : ""}
                                                    onChange={(e) => handleUpdateRound(task._id, e.target.value)}
                                                    className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5 font-medium shadow-sm hover:border-purple-500/50 transition-colors"
                                                >
                                                    <option value="">Select Round</option>
                                                    {ALLOWED_ROUNDS.map(round => (
                                                        <option key={round} value={round} disabled={round === task.currentRound}>
                                                            {round}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>

                {/* Loader Sentinel */}
                {displayedTasks.length < filteredTasks.length && (
                    <div ref={ref} className="py-8 flex justify-center">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <RefreshCw size={16} className="animate-spin" />
                            Loading more...
                        </div>
                    </div>
                )}

                {/* End Of list */}
                {displayedTasks.length === filteredTasks.length && filteredTasks.length > 0 && (
                    <div className="py-12 text-center text-slate-500 text-sm">
                        All mismatches loaded
                    </div>
                )}

                {filteredTasks.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4 border border-green-500/20">
                            <ClipboardCheck className="text-green-500" size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-white">No mismatches found</h3>
                        <p className="text-slate-400 mt-1">Status and rounds seem to be consistent.</p>
                    </div>
                )}
            </div>

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50 min-w-[320px]"
                    >
                        <div className="flex items-center gap-3 border-r border-slate-700 pr-4">
                            <span className="bg-purple-600 text-xs font-bold px-2 py-1 rounded-full">
                                {selectedIds.size}
                            </span>
                            <span className="text-sm font-medium">Selected</span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-slate-400 hover:text-white transition-colors ml-1"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-300">Set Round:</span>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) handleBulkUpdate(e.target.value);
                                }}
                                disabled={isBulkUpdating}
                                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-purple-500 block p-2 font-medium hover:bg-slate-700 transition-colors cursor-pointer outline-none"
                                defaultValue=""
                            >
                                <option value="" disabled>Select Round</option>
                                {ALLOWED_ROUNDS.map(round => (
                                    <option key={round} value={round}>
                                        {round}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {isBulkUpdating && <RefreshCw size={16} className="animate-spin text-slate-400 ml-auto" />}
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
}
