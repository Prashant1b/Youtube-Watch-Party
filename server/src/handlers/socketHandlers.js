import { randomUUID } from "crypto";
import { RoomModel } from "../models/RoomModel.js";
import { verifyToken } from "../middleware/auth.js";

function fail(socket, message) {
  socket.emit("error", { message });
}

async function withRoom(socket, rooms, roomId) {
  const room = await rooms.getRoom(roomId);
  if (!room) fail(socket, "Room not found");
  return room;
}

function guardControl(socket, room, userId) {
  if (!room?.canControl(userId)) {
    fail(socket, "Only hosts and moderators can control playback");
    return false;
  }
  return true;
}

function guardHost(socket, room, userId) {
  if (!room?.isHost(userId)) {
    fail(socket, "Only the host can perform this action");
    return false;
  }
  return true;
}

function roomUserId(socket, roomId) {
  return socket.data.user?.userId ?? socket.data.guestRooms?.[roomId] ?? socket.id;
}

async function saveRoomState(room) {
  await RoomModel.updateOne(
    { roomId: room.roomId },
    {
      videoId: room.state.videoId,
      playState: room.state.playState,
      currentTime: room.state.currentTime,
      stateUpdatedAt: room.state.updatedAt
    }
  );
}

export function registerSocketHandlers(io, rooms) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    socket.data.user = verifyToken(token);
    socket.data.guestRooms = {};
    next();
  });

  io.on("connection", (socket) => {
    socket.on("join_room", async ({ roomId, username, guestId }) => {
      const room = await withRoom(socket, rooms, roomId);
      if (!room) return;
      const authUser = socket.data.user;
      const cleanGuestId = String(guestId ?? "").trim();
      const userId = authUser?.userId ?? (cleanGuestId.startsWith("guest-") ? cleanGuestId : socket.id);
      const displayName = authUser?.username ?? username?.trim() ?? "Guest";
      socket.data.guestRooms[roomId] = userId;
      const participant = room.join(userId, displayName, socket.id);
      socket.join(roomId);
      socket.emit("sync_state", room.syncState());
      socket.emit("role_assigned", { participants: room.participantsList(), self: participant.toJSON() });
      room.broadcast(io, "user_joined", { participants: room.participantsList() });
    });

    socket.on("leave_room", async ({ roomId }) => {
      const room = await withRoom(socket, rooms, roomId);
      const userId = socket.data.user?.userId ?? socket.data.guestRooms?.[roomId] ?? socket.id;
      const previousHostId = room?.hostId;
      const participant = room?.remove(userId);
      socket.leave(roomId);
      if (room && participant) {
        if (previousHostId !== room.hostId) await RoomModel.updateOne({ roomId }, { hostId: room.hostId });
        room.broadcast(io, "user_left", { participants: room.participantsList() });
        room.broadcast(io, "host_transferred", { participants: room.participantsList(), hostId: room.hostId });
      }
    });

    socket.on("disconnect", async () => {
      for (const joined of socket.rooms) {
        if (joined === socket.id) continue;
        const room = await rooms.getRoom(joined);
        if (!room) continue;
        const userId = socket.data.user?.userId ?? socket.data.guestRooms?.[joined] ?? socket.id;
        const participant = room.participant(userId);
        if (participant?.socketId !== socket.id) continue;
        const previousHostId = room.hostId;
        room.remove(userId);
        if (previousHostId !== room.hostId) await RoomModel.updateOne({ roomId: joined }, { hostId: room.hostId });
        room.broadcast(io, "user_left", { participants: room.participantsList() });
        room.broadcast(io, "host_transferred", { participants: room.participantsList(), hostId: room.hostId });
      }
    });

    socket.on("play", async ({ roomId, time }) => {
      const room = await withRoom(socket, rooms, roomId);
      const userId = roomUserId(socket, roomId);
      if (!room || !guardControl(socket, room, userId)) return;
      room.setPlayState("playing", time);
      await saveRoomState(room);
      room.broadcast(io, "sync_state", room.syncState());
    });

    socket.on("pause", async ({ roomId, time }) => {
      const room = await withRoom(socket, rooms, roomId);
      const userId = roomUserId(socket, roomId);
      if (!room || !guardControl(socket, room, userId)) return;
      room.setPlayState("paused", time);
      await saveRoomState(room);
      room.broadcast(io, "sync_state", room.syncState());
    });

    socket.on("seek", async ({ roomId, time }) => {
      const room = await withRoom(socket, rooms, roomId);
      const userId = roomUserId(socket, roomId);
      if (!room || !guardControl(socket, room, userId)) return;
      room.seek(time);
      await saveRoomState(room);
      room.broadcast(io, "sync_state", room.syncState());
    });

    socket.on("change_video", async ({ roomId, videoId }) => {
      const room = await withRoom(socket, rooms, roomId);
      const userId = roomUserId(socket, roomId);
      if (!room || !guardControl(socket, room, userId)) return;
      room.changeVideo(videoId);
      await saveRoomState(room);
      room.broadcast(io, "sync_state", room.syncState());
    });

    socket.on("assign_role", async ({ roomId, userId, role }) => {
      const room = await withRoom(socket, rooms, roomId);
      const actorId = roomUserId(socket, roomId);
      if (!room || !guardHost(socket, room, actorId) || role === "host") return;
      room.assignRole(userId, role);
      room.broadcast(io, "role_assigned", { participants: room.participantsList() });
    });

    socket.on("remove_participant", async ({ roomId, userId }) => {
      const room = await withRoom(socket, rooms, roomId);
      const actorId = roomUserId(socket, roomId);
      if (!room || !guardHost(socket, room, actorId) || userId === actorId) return;
      const removed = room.remove(userId);
      if (removed) io.to(removed.socketId).emit("participant_removed", { roomId });
      room.broadcast(io, "user_left", { participants: room.participantsList() });
    });

    socket.on("transfer_host", async ({ roomId, userId }) => {
      const room = await withRoom(socket, rooms, roomId);
      const actorId = roomUserId(socket, roomId);
      if (!room || !guardHost(socket, room, actorId)) return;
      room.transferHost(userId);
      await RoomModel.updateOne({ roomId }, { hostId: userId });
      room.broadcast(io, "host_transferred", { participants: room.participantsList(), hostId: room.hostId });
    });

    socket.on("request_change", async ({ roomId, type, payload }) => {
      const room = await withRoom(socket, rooms, roomId);
      const userId = roomUserId(socket, roomId);
      if (!room) return;
      const request = room.createRequest(userId, type, payload);
      room.broadcast(io, "change_requested", request);
    });

    socket.on("resolve_request", async ({ roomId, requestId, approved }) => {
      const room = await withRoom(socket, rooms, roomId);
      const userId = roomUserId(socket, roomId);
      if (!room || !guardControl(socket, room, userId)) return;
      const request = room.resolveRequest(requestId, approved);
      if (request?.type === "video" && approved && typeof request.payload.videoId === "string") {
        await saveRoomState(room);
      } else if (approved) {
        await saveRoomState(room);
      }
      room.broadcast(io, "request_resolved", { requestId, approved });
      if (approved) room.broadcast(io, "sync_state", room.syncState());
    });

    socket.on("chat_message", async ({ roomId, text }) => {
      const room = await withRoom(socket, rooms, roomId);
      const userId = roomUserId(socket, roomId);
      const participant = room?.participant(userId);
      if (!room || !participant || !text?.trim()) return;
      room.broadcast(io, "chat_message", {
        id: randomUUID(),
        userId,
        username: participant.username,
        text: text.trim().slice(0, 500),
        createdAt: Date.now()
      });
    });
  });
}
