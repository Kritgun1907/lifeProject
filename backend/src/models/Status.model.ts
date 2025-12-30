import { Schema, model, InferSchemaType } from "mongoose";
import { STATUS } from "../constants/enums";

const statusSchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: STATUS as readonly string[],
        unique: true,
    },
    },{ timestamps: { createdAt: "created_at" } }
    );

export type StatusDocument = InferSchemaType<typeof statusSchema>;
export const Status = model<StatusDocument>("Status", statusSchema);
