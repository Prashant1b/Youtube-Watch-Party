import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Server } from "socket.io";
import { UserModel } from "./models/UserModel.js";
import { RoomManager } from "./domain/RoomManager.js";
import { signToken, verifyToken } from "./middleware/auth.js";
import { registerSocketHandlers } from "./handlers/socketHandlers.js";

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, "");
if (!clientUrl) {
  throw new Error("CLIENT_URL environment variable is required");
}
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error("MONGODB_URI environment variable is required");
}
const rooms = new RoomManager();

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: clientUrl, credentials: true },
  transports: ["websocket", "polling"]
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", async (req, res) => {
  const username = String(req.body.username ?? "").trim();
  const password = String(req.body.password ?? "");
  if (username.length < 2 || password.length < 4) return res.status(400).json({ message: "Username and 4+ character password required" });
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await UserModel.create({ username, passwordHash });
    res.status(201).json({ token: signToken(user.id, username), user: { userId: user.id, username } });
  } catch {
    res.status(409).json({ message: "Username already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body.username ?? "").trim();
  const password = String(req.body.password ?? "");
  const user = await UserModel.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid credentials" });
  res.json({ token: signToken(user.id, user.username), user: { userId: user.id, username: user.username } });
});

app.post("/api/rooms", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = verifyToken(token);
  const guestId = String(req.body?.guestId ?? "").trim();
  const hostId = user?.userId ?? (guestId.startsWith("guest-") ? guestId : "");
  if (!hostId) return res.status(400).json({ message: "Login or guest session required" });
  const room = await rooms.createRoom(hostId);
  res.status(201).json({ roomId: room.roomId, link: `/room/${room.roomId}` });
});

app.get("/api/rooms/:roomId", async (req, res) => {
  const exists = await rooms.roomExists(req.params.roomId);
  if (!exists) return res.status(404).json({ message: "Room not found" });
  res.json({ roomId: req.params.roomId });
});

registerSocketHandlers(io, rooms);

await mongoose.connect(mongoUri);
server.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
