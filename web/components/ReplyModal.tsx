import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Calendar } from 'lucide-react';

interface Reply {
    id?: string;
    sender: string;
    body?: string;
    date: string;
    snippet?: string;
    [key: string]: unknown;
}

interface ReplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    replies: Reply[];
    taskTitle: string;
    currentInterviewRound?: string;
    taskId?: string;
    onUpdateRound?: (newRound: string) => void;
    currentStatus?: string;
    onUpdateStatus?: (newStatus: string) => void;
}

const ALLOWED_ROUNDS = [
    "1st Round", "2nd Round", "3rd Round", "4th Round", "Screening",
    "On Demand or AI Interview", "5th Round", "Technical Round",
    "Coding Round", "Final Round", "Loop Round"
];

export default function ReplyModal({
    isOpen,
    onClose,
    replies,
    taskTitle,
    currentInterviewRound,
    onUpdateRound,
    currentStatus,
    onUpdateStatus
}: ReplyModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-slate-900 shrink-0 sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white line-clamp-1 pr-4">
                                    {taskTitle || 'Email Thread'}
                                </h3>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-400">Extracted Round:</span>
                                        {onUpdateRound ? (
                                            <select
                                                value={currentInterviewRound || ''}
                                                onChange={(e) => onUpdateRound(e.target.value)}
                                                className="text-sm border border-white/10 rounded px-2 py-1 outline-none focus:border-purple-500 font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                                            >
                                                <option value="">Select Round</option>
                                                {ALLOWED_ROUNDS.map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="font-medium text-slate-200">{currentInterviewRound || 'N/A'}</span>
                                        )}
                                    </div>

                                    {onUpdateStatus && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-400">Status:</span>
                                            <select
                                                value={currentStatus || 'Pending'}
                                                onChange={(e) => onUpdateStatus(e.target.value)}
                                                className="text-sm border border-white/10 rounded px-2 py-1 outline-none focus:border-purple-500 font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                                            >
                                                {['Completed', 'Not Done', 'Pending', 'Cancelled', 'Acknowledged', 'Assigned', 'Rescheduled'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/50">
                            {replies && replies.length > 0 ? (
                                replies.map((reply, i) => (
                                    <div key={i} className="glass-card p-5 rounded-xl">
                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold border border-purple-500/20">
                                                    {(reply.sender || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-sm font-semibold text-slate-200">
                                                    {reply.sender}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Calendar size={12} />
                                                {reply.date || 'Unknown Date'}
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                                            {reply.body || reply.snippet || 'No content preview available.'}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
                                    <p>No email replies found explicitly linked to this task.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
