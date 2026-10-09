import { customAlphabet } from "nanoid";
import { Room } from "./Room.js";
import { RoomModel } from "../models/RoomModel.js";

const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export class RoomManager {
  rooms = new Map();

  async createRoom(hostId, videoId = "dQw4w9WgXcQ") {
    let roomId = roomCode();
    while (await RoomModel.exists({ roomId })) roomId = roomCode();
    const room = new Room(roomId, hostId, videoId);
    this.rooms.set(roomId, room);
    await RoomModel.create({
      roomId,
      hostId,
      videoId,
      playState: room.state.playState,
      currentTime: room.state.currentTime,
      stateUpdatedAt: room.state.updatedAt
    });
    return room;
  }

  async getRoom(roomId) {
    const cached = this.rooms.get(roomId);
    if (cached) return cached;
    const saved = await RoomModel.findOne({ roomId });
    if (!saved) return undefined;
    const room = new Room(saved.roomId, saved.hostId, saved.videoId, {
      playState: saved.playState,
      currentTime: saved.currentTime,
      updatedAt: saved.stateUpdatedAt
    });
    this.rooms.set(roomId, room);
    return room;
  }

  async roomExists(roomId) {
    return Boolean(this.rooms.has(roomId) || await RoomModel.exists({ roomId }));
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }
}
