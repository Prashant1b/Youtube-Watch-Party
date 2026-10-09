import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    hostId: { type: String, required: true },
    videoId: { type: String, required: true },
    playState: { type: String, enum: ["playing", "paused"], default: "paused" },
    currentTime: { type: Number, default: 0 },
    stateUpdatedAt: { type: Number, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export const RoomModel = mongoose.model("Room", roomSchema);
