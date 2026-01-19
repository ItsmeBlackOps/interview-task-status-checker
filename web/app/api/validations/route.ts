import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';

export const dynamic = 'force-dynamic';

// NDJSON Streaming
export async function GET(req: Request) {
    try {
        await dbConnect();

        // 1. Create a stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    // 2. Mongoose Cursor
                    // Remove limit(1000) or keep it if performance demands cap. 
                    // Streaming allows handling larger sets, but for "one by one" feel, standard sort/filter applies.
                    // Filter by Date if provided
                    const { searchParams } = new URL(req.url);
                    const dateFilter = searchParams.get('date');

                    let query = {};

                    if (dateFilter) {
                        // User searching for specific date: strict regex on receivedDateTime (or Date of Interview?)
                        // User request implies Live Feed Logic is the default.
                        // Existing code used receivedDateTime for regex.
                        query = { receivedDateTime: { $regex: dateFilter, $options: 'i' } };
                    } else {
                        // DEFAULT: Live Feed Logic
                        // 1. "Older than today": Show active (Exclude Final)
                        // 2. "Today or Future": Show Pending/Assigned only

                        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

                        const FINAL_STATUSES = ['Completed', 'Not Done', 'Cancelled', 'Rescheduled'];
                        const FUTURE_STATUSES = ['Pending', 'Assigned'];

                        query = {
                            $or: [
                                {
                                    $and: [
                                        { 'Date of Interview': { $lt: today } },
                                        { status: { $nin: FINAL_STATUSES } }
                                    ]
                                },
                                {
                                    $and: [
                                        { 'Date of Interview': { $gte: today } },
                                        { status: { $in: FUTURE_STATUSES } }
                                    ]
                                }
                            ]
                        };
                    }

                    const cursor = Task.find(query).cursor();

                    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                        // 3. Yield JSON string + newline
                        const chunk = JSON.stringify(doc) + '\n';
                        controller.enqueue(encoder.encode(chunk));
                    }

                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            }
        });

        // 4. Return stream response
        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        // Bulk
        if (body.ids && Array.isArray(body.ids)) {
            const { ids, status } = body;
            await Task.updateMany({ _id: { $in: ids } }, { $set: { status } });
            return NextResponse.json({ success: true, count: ids.length });
        }

        // Single
        const { id, status } = body;
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        await Task.updateOne({ _id: id }, { $set: { status } });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
