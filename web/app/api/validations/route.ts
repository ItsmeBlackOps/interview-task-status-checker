import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        const tasks = await Task.find({}).sort({ date: -1 }).lean();
        return NextResponse.json(tasks);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
