'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, RefreshCw, Calendar, FileText, User, Hash } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ValidationTask {
    _id: string;
    'Candidate Name'?: string;
    candidateName?: string;
    subject: string;
    date: string; // Keeping for deprecated/fallback usage if API still sends it
    receivedDateTime?: string; // New key
    currentRound?: string;
    status: string;
    'Interview Round'?: string;
    'Date of Interview'?: string;
    dateOfInterview?: string;
    'Start Time Of Interview'?: string;
    Technology?: string;
}

import { useTaskStream } from '../hooks/useTaskStream';

// ... (imports remain)

export default function ValidationFeed() {
    // 1. Get Today in EST (YYYY-MM-DD) for API Filter
    const todayEST = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD

    // Fetch with filter
    const { tasks, loading, error, refresh: fetchTasks } = useTaskStream<ValidationTask>(`/api/validations?date=${todayEST}`);

    const [statusFilter, setStatusFilter] = useState('All');
    const [activeTab, setActiveTab] = useState<'issues' | 'passed'>('issues'); // Default to issues? Or passed? User listed "passed and with issues". Let's default to 'issues' as it's actionable.

    // --- Validation Logic ---
    const getValidationErrors = (task: ValidationTask): string[] => {
        const errors: string[] = [];

        // 1. EST Date Check: Strict "Today" check for filtering (handled in fetch/filter phase actually?)
        // The user said: "Firstly it should only show the tasks where receivedDateTime is including date of today as per est"
        // So we should probably FILTER the list before displaying.
        // But let's check validation rules for displayed items first.

        // 2. Format Checks (Validation Formula)
        // Formula: "Interview Support - ${Candidate Name} - ${Technology} - ${FormattedDate} at ${StartTime} EST"
        // Example: "Interview Support - Sushmitha Pallela - Data Engineer - Jan 26, 2026 at 01:00 PM EST"

        const candidateName = task['Candidate Name'] || task.candidateName;
        const technology = task.Technology;
        const dateOfInterview = task['Date of Interview'] || task.dateOfInterview; // "01/26/2026"
        const startTime = task['Start Time Of Interview']; // "01:00 PM"

        if (!task.subject) {
            errors.push("Missing Subject");
        } else if (candidateName && technology && dateOfInterview && startTime) {
            try {
                // Parse Date: "01/26/2026" -> "Jan 26, 2026"
                // Warning: Date parsing might differ by locale.
                const [month, day, year] = dateOfInterview.split('/').map(Number);
                const d = new Date(year, month - 1, day);
                const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
                const formattedDate = d.toLocaleDateString('en-US', options); // "Jan 26, 2026"

                const expectedSubject = `Interview Support - ${candidateName} - ${technology} - ${formattedDate} at ${startTime} EST`;

                // Compare (Case insensitive? Strict?)
                // User said "made of a formala", assuming strict match.
                if (task.subject.trim() !== expectedSubject.trim()) {
                    errors.push(`Subject Mismatch. Expected: "${expectedSubject}"`);
                }

            } catch (e) {
                errors.push("Error constructing expected subject (Date/Time format invalid)");
            }
        } else {
            errors.push("Missing fields for Subject Validation (Name, Tech, Date, Time)");
        }

        // 3. Round Check: ALLOWED_ROUNDS
        const round = task.currentRound || task['Interview Round'];
        const ALLOWED_ROUNDS = [
            "1st Round", "2nd Round", "3rd Round", "4th Round", "Screening",
            "On Demand or AI Interview", "5th Round", "Technical Round",
            "Coding Round", "Final Round", "Loop Round"
        ];

        if (!round || !ALLOWED_ROUNDS.includes(round)) {
            errors.push(`Invalid Interview Round: "${round || 'N/A'}"`);
        }

        return errors;
    };

    const validatedTasks = tasks
        .filter(t => statusFilter === 'All' || t.status === statusFilter)
        .map(t => ({
            ...t,
            validationErrors: getValidationErrors(t)
        }));

    const validCount = validatedTasks.filter(t => t.validationErrors.length === 0).length;
    const invalidCount = validatedTasks.length - validCount;

    return (
        <div className="max-w-6xl mx-auto pb-24">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">Validation Check</h2>
                    <p className="text-slate-400 mt-1">Format & Timestamp verification for {tasks.length} tasks.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-900/50 border border-white/5 text-xs text-slate-300 rounded-lg px-2 py-1.5 outline-none hover:text-white transition-colors cursor-pointer [&>option]:bg-slate-900"
                    >
                        <option value="All">All Status</option>
                        {['Completed', 'Not Done', 'Pending', 'Cancelled', 'Acknowledged', 'Assigned', 'Rescheduled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div className="flex bg-slate-900/50 rounded-xl p-1 border border-white/5">
                        <div className="px-4 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium border border-green-500/20">
                            {validCount} Valid
                        </div>
                        <div className="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium border border-red-500/20 ml-1">
                            {invalidCount} Issues
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('issues')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors relative",
                        activeTab === 'issues' ? "text-red-400" : "text-slate-400 hover:text-red-300"
                    )}
                >
                    With Issues ({invalidCount})
                    {activeTab === 'issues' && <motion.div layoutId="tab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-red-400" />}
                </button>
                <button
                    onClick={() => setActiveTab('passed')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors relative",
                        activeTab === 'passed' ? "text-green-400" : "text-slate-400 hover:text-green-300"
                    )}
                >
                    Passed ({validCount})
                    {activeTab === 'passed' && <motion.div layoutId="tab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-green-400" />}
                </button>
                <button
                    onClick={fetchTasks}
                    disabled={loading}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors border border-white/5 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {validatedTasks
                        .filter(t => activeTab === 'passed' ? t.validationErrors.length === 0 : t.validationErrors.length > 0)
                        .map((task) => {
                            const isValid = task.validationErrors.length === 0;
                            return (
                                <motion.div
                                    key={task._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "glass-card rounded-xl p-6 border-l-4 relative overflow-hidden group",
                                        isValid ? "border-l-green-500" : "border-l-red-500"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-slate-200 truncate">
                                                    {task['Candidate Name'] || task.candidateName || 'Unknown Candidate'}
                                                </h3>
                                                <span className={cn(
                                                    "text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                                    isValid
                                                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                )}>
                                                    {isValid ? "PASSED" : "FAILED"}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-6 text-sm text-slate-500 mb-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} />
                                                    {task.date}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Hash size={14} />
                                                    {task.currentRound || task['Interview Round'] || 'N/A'}
                                                </div>
                                            </div>

                                            {!isValid && (
                                                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 space-y-1">
                                                    {task.validationErrors.map((err, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-sm text-red-400">
                                                            <AlertTriangle size={14} />
                                                            {err}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {isValid && (
                                                <div className="text-sm text-green-400/80 flex items-center gap-2">
                                                    <CheckCircle2 size={14} />
                                                    All formats match required criteria.
                                                </div>
                                            )}

                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-mono text-slate-600 mb-1">SUBJECT</div>
                                            <div className="text-sm text-slate-400 max-w-xs truncate" title={task.subject}>
                                                {task.subject}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                </AnimatePresence>
            </div>
        </div >
    );
}
