import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';
import Task, { ITask } from '@/models/Task';

export const dynamic = 'force-dynamic';

const ALLOWED_ROUNDS = [
    "1st Round", "2nd Round", "3rd Round", "4th Round", "Screening",
    "On Demand or AI Interview", "5th Round", "Technical Round",
    "Coding Round", "Final Round", "Loop Round"
];

// Regex for extracting round
const ROUND_REGEX = /(1st|2nd|3rd|4th|5th|final|coding|technical|screening|loop|on demand|ai)\s*round/i;
// Helper to normalize round string (capitalize)
function normalizeRound(r: string): string {
    if (!r) return '';
    const lower = r.toLowerCase();
    // Simplified matching to allowed list
    const found = ALLOWED_ROUNDS.find(ar => ar.toLowerCase().includes(lower.replace(' round', '')) || lower.includes(ar.toLowerCase()));
    if (found) return found;
    // Fallback formatting
    return r.replace(/\b\w/g, l => l.toUpperCase());
}

function extractRound(task: ITask): string | null {
    // Check replies
    if (task.replies && task.replies.length > 0) {
        for (const reply of task.replies) {
            const match = reply.body?.match(ROUND_REGEX) || reply.snippet?.match(ROUND_REGEX);
            if (match) return normalizeRound(match[0]);
        }
    }
    // Check subject
    const subjectMatch = task.subject.match(ROUND_REGEX);
    if (subjectMatch) return normalizeRound(subjectMatch[0]);

    return null;
}

export async function GET() {
    try {
        await dbConnect();

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                // Cursor to iterate huge dataset
                const cursor = Task.find({ "actualRound": { "$exists": true } }).lean().cursor();

                for await (const doc of cursor) {
                    const task = doc as unknown as ITask;

                    let currentRound = task.actualRound;
                    if (!currentRound) {
                        currentRound = extractRound(task) || task['Interview Round']; // Legacy field fallback
                    }

                    // Validate
                    if (currentRound && !ALLOWED_ROUNDS.includes(currentRound)) {
                        // Mismatch found
                        // Augment task
                        const payload = {
                            ...task,
                            currentRound: currentRound,
                            allowed: false,
                            reason: 'Invalid Round Detect'
                        };
                        controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
                    } else if (currentRound && ALLOWED_ROUNDS.includes(currentRound)) {
                        // Also logic might require verifying if extracted != actual?
                        // "Detected ... tasks where the extracted round doesn't match the database"
                        // If actualRound matches extracted, it's fine.
                        // If actualRound differs from extracted, maybe flag?
                        // For now implementing "invalid round" check as priority based on Feed UI.
                    }
                }
                controller.close();
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error: unknown) {
        console.error("Mismatches API Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        // Bulk
        if (body.ids && Array.isArray(body.ids)) {
            const { ids, actualRound } = body;
            await Task.updateMany(
                { _id: { $in: ids } },
                { $set: { actualRound: actualRound } }
            );
            return NextResponse.json({ success: true, count: ids.length });
        }

        // Single
        const { id, actualRound } = body;
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        if (actualRound === null) {
            // Remove
            await Task.updateOne({ _id: id }, { $unset: { actualRound: "" } });
        } else {
            // Update
            await Task.updateOne({ _id: id }, { $set: { actualRound } });
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error("Mismatches PATCH Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
