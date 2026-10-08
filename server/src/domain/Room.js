import { randomUUID } from "crypto";
import { Participant } from "./Participant.js";

const privileged = new Set(["host", "moderator"]);

export class Room {
  participants = new Map();
  requests = new Map();

  constructor(roomId, hostId, videoId = "dQw4w9WgXcQ") {
    this.roomId = roomId;
    this.hostId = hostId;
    this.state = {
      playState: "paused",
      currentTime: 0,
      updatedAt: Date.now(),
      videoId
    };
  }

  join(userId, username, socketId) {
    const existing = this.participants.get(userId);
    const role = existing?.role ?? (userId === this.hostId ? "host" : "participant");
    const participant = new Participant(userId, username, userId === this.hostId ? "host" : role, socketId, existing?.joinedAt);
    this.participants.set(userId, participant);
    return participant;
  }

  remove(userId) {
    const participant = this.participants.get(userId);
    this.participants.delete(userId);
    if (userId === this.hostId && this.participants.size) this.promoteNextHost();
    return participant;
  }

  participantsList() {
    return [...this.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => p.toJSON());
  }

  participant(userId) {
    return this.participants.get(userId);
  }

  canControl(userId) {
    const role = this.participant(userId)?.role;
    return role ? privileged.has(role) : false;
  }

  isHost(userId) {
    return this.participant(userId)?.role === "host";
  }

  syncState() {
    const currentTime = this.state.playState === "playing"
      ? this.state.currentTime + (Date.now() - this.state.updatedAt) / 1000
      : this.state.currentTime;
    return { ...this.state, currentTime };
  }

  setPlayState(playState, currentTime) {
    this.state.currentTime = typeof currentTime === "number" ? currentTime : this.syncState().currentTime;
    this.state.playState = playState;
    this.state.updatedAt = Date.now();
  }

  seek(time) {
    this.state.currentTime = Math.max(0, time);
    this.state.updatedAt = Date.now();
  }

  changeVideo(videoId) {
    this.state.videoId = videoId;
    this.state.currentTime = 0;
    this.state.playState = "paused";
    this.state.updatedAt = Date.now();
  }

  assignRole(userId, role) {
    const participant = this.participants.get(userId);
    if (!participant) return;
    participant.role = role;
  }

  transferHost(userId) {
    const next = this.participants.get(userId);
    const old = this.participants.get(this.hostId);
    if (!next) return;
    if (old) old.role = "moderator";
    next.role = "host";
    this.hostId = userId;
  }

  createRequest(userId, type, payload) {
    const participant = this.participants.get(userId);
    if (!participant) throw new Error("Unknown participant");
    const request = {
      requestId: randomUUID(),
      userId,
      username: participant.username,
      type,
      payload,
      createdAt: Date.now()
    };
    this.requests.set(request.requestId, request);
    return request;
  }

  resolveRequest(requestId, approved) {
    const request = this.requests.get(requestId);
    if (!request) return undefined;
    this.requests.delete(requestId);
    if (approved) {
      if (request.type === "seek" && typeof request.payload.time === "number") this.seek(request.payload.time);
      if (request.type === "video" && typeof request.payload.videoId === "string") this.changeVideo(request.payload.videoId);
    }
    return request;
  }

  broadcast(io, event, payload) {
    io.to(this.roomId).emit(event, payload);
  }

  promoteNextHost() {
    const ordered = [...this.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt);
    const next = ordered.find((p) => p.role === "moderator") ?? ordered[0];
    if (!next) return;
    next.role = "host";
    this.hostId = next.userId;
  }
}
