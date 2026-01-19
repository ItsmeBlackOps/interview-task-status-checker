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
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Completed': 'bg-green-100 text-green-800 border-green-200',
    'Rejected': 'bg-red-100 text-red-800 border-red-200',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'Mismatch': 'bg-orange-100 text-orange-800 border-orange-200',
    // Add more as needed
};

const DEFAULT_COLOR = 'bg-slate-100 text-slate-800 border-slate-200';

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
