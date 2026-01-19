import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task, { ITask } from '@/models/Task';

export const dynamic = 'force-dynamic';

function getBranch(task: ITask): string {
    let ccString = '';
    if (Array.isArray(task.cc)) {
        ccString = task.cc.join(' ');
    } else if (typeof task.cc === 'string') {
        ccString = task.cc;
    }

    const text = (task.sender + ' ' + ccString).toLowerCase();

    if (text.includes('tushar.ahuja')) return 'GGR';
    if (text.includes('akash.avasthi')) return 'AHM';
    if (text.includes('aryan.mishra')) return 'LKO';

    return 'Other';
}

// Parsing helpers
function parseMMDDYYYY(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
}

function parseISO(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

// Start of data structure for response
// Branch -> Round -> Status -> Count
type StatusCounts = Record<string, number>;
type RoundMap = Record<string, StatusCounts>;
type BranchMap = Record<string, RoundMap>;

export async function GET(req: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const startDateStr = searchParams.get('startDate'); // YYYY-MM-DD (Native Input)
        const endDateStr = searchParams.get('endDate');     // YYYY-MM-DD (Native Input)
        const dateField = searchParams.get('dateField') || 'interview'; // 'interview' | 'received'

        // Native date inputs send YYYY-MM-DD, which is parseable by new Date() usually, but let's be safe
        // Actually, let's treat input params as YYYY-MM-DD strings to compare against
        const start = startDateStr ? new Date(startDateStr) : null;
        const end = endDateStr ? new Date(endDateStr) : null;
        if (end) end.setHours(23, 59, 59, 999); // Inclusive end day

        // Fetch needed fields
        const tasks = await Task.find({}, {
            sender: 1,
            cc: 1,
            status: 1,
            actualRound: 1,
            'Interview Round': 1,
            'Date of Interview': 1,
            currentRound: 1,
            date: 1,
            receivedDateTime: 1
        }).lean() as ITask[];

        const stats: BranchMap = {
            GGR: {},
            LKO: {},
            AHM: {},
            Other: {}
        };

        tasks.forEach(task => {
            // 1. Filter by Date
            if (start || end) {
                let taskDate: Date | null = null;

                if (dateField === 'received') {
                    // receivedDateTime is ISO-ish or string? check model.
                    taskDate = parseISO(task.receivedDateTime);
                } else {
                    // Date of Interview is MM/DD/YYYY
                    taskDate = parseMMDDYYYY(task['Date of Interview']);
                }

                if (!taskDate) return; // Skip if date missing
                if (start && taskDate < start) return;
                if (end && taskDate > end) return;
            }

            // 2. Identify Branch
            const branch = getBranch(task);

            // 3. Identify Round and Status
            // "actualRounds value only if actualRounds is not there we will use Interview Round Value"
            const round = task.actualRound || task['Interview Round'] || 'Unknown Round';
            const status = task.status || 'Unknown';

            // 4. Update Stats
            if (!stats[branch][round]) {
                stats[branch][round] = {};
            }
            stats[branch][round][status] = (stats[branch][round][status] || 0) + 1;
        });

        return NextResponse.json(stats);

    } catch (error: unknown) {
        console.error('Reports API Error:', error);
        return NextResponse.json({ error: (error as Error)?.message || 'Error' }, { status: 500 });
    }
}
