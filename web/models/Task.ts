import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
    sender: string;
    cc: string[];
    subject: string;
    snippet?: string;
    labels: string[];
    date: string;
    threadId: string;
    historyId: string;
    status: string;
    'Interview Round'?: string;
    'Date of Interview'?: string;
    currentRound?: string;
    dateOfInterview?: string;
    candidateName?: string;
    reason?: string;
    actualRound?: string | null;
    replies?: any[];
}

const TaskSchema: Schema = new Schema({
    sender: { type: String, required: true },
    cc: { type: [String], default: [] },
    subject: { type: String, required: true },
    snippet: { type: String },
    labels: { type: [String], default: [] },
    date: { type: String, required: true },
    threadId: { type: String, required: true, unique: true },
    historyId: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    'Interview Round': { type: String },
    'Date of Interview': { type: String },
    currentRound: { type: String },
    dateOfInterview: { type: String },
    candidateName: { type: String },
    reason: { type: String },
    actualRound: { type: String },
    replies: { type: Array, default: [] },
}, { collection: 'taskBody', strict: false });

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
