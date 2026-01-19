import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task, { ITask } from '@/models/Task';

export const dynamic = 'force-dynamic';

function getBranch(task: ITask): string {
    const text = (task.sender + ' ' + (task.cc?.join(' ') || '')).toLowerCase();
    if (text.includes('gurugram') || text.includes('ggr')) return 'GGR';
    if (text.includes('lucknow') || text.includes('lko')) return 'LKO';
    if (text.includes('ahmedabad') || text.includes('ahm')) return 'AHM';
    return 'Other';
}

export async function GET(req: Request) {
    try {
        await dbConnect();

        // Check if DB is ready (extra safety from viewed code)
        // dbConnect handles it.

        const tasks = await Task.find({}, {
            sender: 1,
            cc: 1,
            status: 1,
            actualRound: 1,
            'Interview Round': 1,
            currentRound: 1,
            date: 1
        }).lean() as ITask[];

        const stats: Record<string, any> = {
            GGR: {},
            LKO: {},
            AHM: {},
            Other: {}
        };

        // Initialize structure
        ['GGR', 'LKO', 'AHM', 'Other'].forEach(branch => {
            stats[branch] = {
                total: 0,
                byStatus: {},
                byRound: {}
            };
        });

        tasks.forEach(task => {
            const branch = getBranch(task);
            const s = stats[branch];
            s.total++;

            // Status Count
            const status = task.status || 'Unknown';
            s.byStatus[status] = (s.byStatus[status] || 0) + 1;

            // Round Count
            const round = task.actualRound || task.currentRound || task['Interview Round'] || 'Unknown';
            s.byRound[round] = (s.byRound[round] || 0) + 1;
        });

        return NextResponse.json(stats);

    } catch (error: any) {
        console.error('Reports API Error:', error);
        return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 });
    }
}
