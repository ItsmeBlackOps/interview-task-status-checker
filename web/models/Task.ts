import mongoose, { Schema, Document } from 'mongoose';

export interface IReply {
    id?: string;
    sender: string;
    snippet?: string;
    body?: string;
    date: string;
}

export interface ITask extends Document {
    id: string; // User says 'id', usually mapped from _id or separate.
    sender: string;
    to?: string[]; // 'to'
    cc: string[];
    subject: string;
    body?: string;
    receivedDateTime: string; // THE date field
    // date: string; // DEPRECATED in favor of receivedDateTime per user keys? Or aliased?
    // User keys list "receivedDateTime". 
    // I will keep 'date' mapped to receivedDateTime if needed or switch usage.
    // For now, I will ADD receivedDateTime and make date optional/deprecated (or alias).

    status: string;
    actualRound?: string | null;
    'Interview Round'?: string;
    'Candidate Name'?: string;
    'Date of Interview'?: string;
    'Contact No'?: string;
    'End Client'?: string;
    'End Time Of Interview'?: string;
    'Job Title'?: string;
    'Start Time Of Interview'?: string;
    'Technology'?: string;

    // Internal/Legacy or Computed?
    name_sync_provenance?: string;
    name_synced_at?: string;
    assignedTo?: string;
    assignment?: string;

    replies?: IReply[];

    // Current code uses these, check if we need to map or keep as optional
    currentRound?: string;
}

const TaskSchema: Schema = new Schema({
    id: { type: String },
    sender: { type: String, required: true },
    to: { type: [String] },
    cc: { type: [String], default: [] },
    subject: { type: String, required: true },
    body: { type: String },
    receivedDateTime: { type: String },

    status: { type: String, default: 'Pending' },
    actualRound: { type: String },
    'Interview Round': { type: String },
    'Candidate Name': { type: String },
    'Date of Interview': { type: String },
    'Contact No': { type: String },
    'End Client': { type: String },
    'End Time Of Interview': { type: String },
    'Job Title': { type: String },
    'Start Time Of Interview': { type: String },
    'Technology': { type: String },

    name_sync_provenance: { type: String },
    name_synced_at: { type: String },
    assignedTo: { type: String },
    assignment: { type: String },

    replies: { type: Array, default: [] },

    // Keep for backward compat if code relies on it, but mark strict=false handles extra fields
    currentRound: { type: String },
}, { collection: 'taskBody', strict: false });

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
