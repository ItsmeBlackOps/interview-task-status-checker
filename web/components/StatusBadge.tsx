import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: string[]) {
    return twMerge(clsx(inputs));
}

interface StatusBadgeProps {
    status: string;
    onChange?: (newStatus: string) => void;
    disabled?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    'Completed': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Not Done': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Cancelled': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Acknowledged': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Assigned': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Rescheduled': 'bg-orange-500/10 text-orange-400 border-orange-500/20',

    // Legacy / Fallback
};

const DEFAULT_COLOR = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

export default function StatusBadge({ status, onChange, disabled }: StatusBadgeProps) {
    const colorClass = STATUS_COLORS[status] || DEFAULT_COLOR;

    // Simple readonly badge for now if editing isn't fully spec'd or simple click-to-cycle isn't desired without more context.
    // The user requirement was "edit status... with interactive badge". 
    // For MismatchFeed it is disabled.

    if (disabled) {
        return (
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", colorClass)}>
                {status}
            </span>
        );
    }

    return (
        <select
            value={status}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium border outline-none cursor-pointer appearance-none",
                colorClass
            )}
        >
            {Object.keys(STATUS_COLORS).map(s => (
                <option key={s} value={s}>{s}</option>
            ))}
        </select>
    );
}
