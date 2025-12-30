import { Schema, model, InferSchemaType } from "mongoose";

const instrumentSchema = new Schema({ 
    name: { 
        type: String,
        required: true 
        } 
    },{ timestamps: true }
    );

export type InstrumentDocument = InferSchemaType<typeof instrumentSchema>;
export const Instrument = model<InstrumentDocument>("Instrument", instrumentSchema);
