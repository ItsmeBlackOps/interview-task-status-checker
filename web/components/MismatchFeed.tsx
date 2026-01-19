'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { RefreshCw, Search, AlertCircle, ArrowRight, Clipboard, ClipboardCheck, MessageSquare, ChevronDown, ChevronUp, Copy, Calendar, CheckSquare, Square, X, Trash2 } from 'lucide-react';
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

export default function MismatchFeed() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

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
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
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

                const newTasks: any[] = [];
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const task = JSON.parse(line);
                            newTasks.push(task);
                        } catch (e) {
                            console.warn('Failed to parse NDJSON line', e);
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
                } catch (e) { }
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

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

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
            setSelectedTask((prev: any) => ({ ...prev, currentRound: newRound }));
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
        task.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    const openModal = (task: any) => {
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
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 overflow-hidden ring-1 ring-slate-900/5"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                    <Trash2 className="text-red-500" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Round?</h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    Are you sure you want to remove the 'actualRound' key? This will revert the task to its calculated value.
                                </p>
                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        onClick={() => setDeleteConfirmationId(null)}
                                        className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmRemoveRound}
                                        className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-500/20"
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
                taskTitle={selectedTask ? `${selectedTask.candidateName}` : ''}
                currentInterviewRound={selectedTask?.currentRound} // Pass current round
                taskId={selectedTask?._id}
                onUpdateRound={(newRound) => handleUpdateRound(selectedTask._id, newRound)}
            />

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Round Mismatches</h2>
                    <p className="text-slate-500 mt-1">
                        Detected {filteredTasks.length} tasks where the extracted round doesn't match the database.
                    </p>
                </div>
                <button
                    onClick={fetchMismatches}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-8 flex items-center gap-4">
                {/* Select All Checkbox */}
                <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-slate-600"
                    title="Select All Visible"
                >
                    {isAllSelected ? (
                        <CheckSquare className="text-purple-600" />
                    ) : isIndeterminate ? (
                        <CheckSquare className="text-purple-400 opacity-50" /> // Using CheckSquare as rough indeterminate
                    ) : (
                        <Square />
                    )}
                </button>

                <Search className="text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by candidate name..."
                    className="flex-1 outline-none text-slate-900 placeholder-slate-400 bg-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

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
                                    "bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow relative cursor-pointer group",
                                    isSelected ? "border-purple-400 ring-1 ring-purple-400" : "border-slate-200"
                                )}
                                onClick={() => openModal(task)}
                            >
                                <div className="flex items-center gap-0 p-0 h-32">

                                    {/* Selection Checkbox (Absolute mostly) */}
                                    <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => toggleSelect(task._id)}
                                            className="text-slate-300 hover:text-purple-600 transition-colors"
                                        >
                                            {isSelected ? <CheckSquare className="text-purple-600 fill-purple-100" /> : <Square className="fill-white" />}
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
                                            <h3 className="text-lg font-bold text-slate-900 truncate">
                                                {task.candidateName}
                                            </h3>
                                            <StatusBadge status={task.status} onChange={() => { }} disabled={true} />
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500">

                                            {/* Mismatch Label */}
                                            <div className={cn(
                                                "flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider",
                                                task.allowed ? "bg-orange-50 text-orange-700" : "bg-yellow-50 text-yellow-700"
                                            )}>
                                                <AlertCircle size={12} />
                                                Mismatch
                                            </div>

                                            <div className="h-4 w-px bg-slate-200" />

                                            {/* Copy Subject Button */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(task.subject || "No Subject");
                                                    }}
                                                    title={`Copy Subject: ${task.subject || "No Subject"}`}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Clipboard size={16} />
                                                </button>
                                            </div>

                                            {/* Arrow Hint (Visual cue) */}
                                            <div className="hidden sm:flex text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronDown className="-rotate-90" size={20} />
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                                            {task.dateOfInterview && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {task.dateOfInterview}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Mismatch Visualization & Action */}
                                    <div
                                        className="w-[45%] bg-slate-50/50 self-stretch border-l border-slate-100 p-6 flex flex-col justify-center"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between gap-4">

                                            {/* Extracted Side */}
                                            <div className="flex-1 text-right min-w-0" onClick={() => openModal(task)}>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Extracted</div>
                                                {task.currentRound ? (
                                                    <div className="flex flex-col items-end">
                                                        <div className="font-bold text-slate-700 truncate" title={task.currentRound}>
                                                            {task.currentRound}
                                                        </div>
                                                        {/* Remove Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveRound(task._id);
                                                            }}
                                                            className="mt-2 text-xs flex items-center gap-1 text-red-400 hover:text-red-600 transition-colors ml-auto relative z-10 p-1 hover:bg-red-50 rounded"
                                                            title="Remove 'actualRound' key"
                                                        >
                                                            <Trash2 size={12} />
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="font-bold text-red-500 italic text-sm">
                                                        Not Found
                                                    </div>
                                                )}
                                            </div>

                                            {/* Arrow */}
                                            <ArrowRight className="text-slate-300 shrink-0" size={20} />

                                            {/* Current / Selector Side */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current</div>
                                                {/* Dropdown for quick fix */}
                                                <select
                                                    value={ALLOWED_ROUNDS.includes(task.currentRound) ? task.currentRound : ""}
                                                    onChange={(e) => handleUpdateRound(task._id, e.target.value)}
                                                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5 font-medium shadow-sm hover:border-purple-300 transition-colors"
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
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <RefreshCw size={16} className="animate-spin" />
                            Loading more...
                        </div>
                    </div>
                )}

                {/* End Of list */}
                {displayedTasks.length === filteredTasks.length && filteredTasks.length > 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        All mismatches loaded
                    </div>
                )}

                {filteredTasks.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                            <ClipboardCheck className="text-green-600" size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No mismatches found</h3>
                        <p className="text-slate-500 mt-1">Status and rounds seem to be consistent.</p>
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
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50 min-w-[320px]"
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
                                className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-purple-500 block p-2 font-medium hover:bg-slate-700 transition-colors cursor-pointer"
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
