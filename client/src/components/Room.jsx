import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { VideoPlayer } from "./VideoPlayer";
import { ParticipantList } from "./ParticipantList";
import { Chat } from "./Chat";
import { RequestBanner } from "./RequestBanner";
import { serverUrl } from "../config";

const guestIdKey = "guestId";

function guestId() {
  let id = localStorage.getItem(guestIdKey);
  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(guestIdKey, id);
  }
  return id;
}

export function Room() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const [participants, setParticipants] = useState([]);
  const [self, setSelf] = useState();
  const [state, setState] = useState({ playState: "paused", currentTime: 0, videoId: "dQw4w9WgXcQ", updatedAt: Date.now() });
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState("");
  const remoteRef = useRef();
  const pendingSyncRef = useRef();

  const canControl = self?.role === "host" || self?.role === "moderator";
  const isHost = self?.role === "host";

  useEffect(() => {
    fetch(`${serverUrl}/api/rooms/${roomId}`).then((res) => {
      if (!res.ok) navigate("/");
    });
  }, [roomId, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token") ?? "";
    socket.auth = { token };
    socket.connect();
    socket.emit("join_room", { roomId, username: localStorage.getItem("username") ?? "Guest", guestId: guestId() });

    const list = (payload) => {
      setParticipants(payload.participants);
      if (payload.self) setSelf(payload.self);
      else setSelf((current) => payload.participants.find((p) => p.userId === current?.userId) ?? current);
    };
    const sync = (payload) => {
      setState(payload);
      pendingSyncRef.current = payload;
      if (payload.playState === "playing") remoteRef.current?.play(payload.currentTime);
      else remoteRef.current?.pause(payload.currentTime);
    };
    const changeRequested = (request) => setRequests((current) => [request, ...current]);
    const requestResolved = ({ requestId }) => setRequests((current) => current.filter((request) => request.requestId !== requestId));
    const chat = (message) => setMessages((current) => [...current, message]);
    const error = (payload) => setNotice(payload.message);
    const removed = () => navigate("/");

    socket.on("sync_state", sync);
    socket.on("user_joined", list);
    socket.on("user_left", list);
    socket.on("role_assigned", list);
    socket.on("host_transferred", list);
    socket.on("change_requested", changeRequested);
    socket.on("request_resolved", requestResolved);
    socket.on("chat_message", chat);
    socket.on("error", error);
    socket.on("participant_removed", removed);

    return () => {
      socket.emit("leave_room", { roomId });
      socket.off("sync_state", sync);
      socket.off("user_joined", list);
      socket.off("user_left", list);
      socket.off("role_assigned", list);
      socket.off("host_transferred", list);
      socket.off("change_requested", changeRequested);
      socket.off("request_resolved", requestResolved);
      socket.off("chat_message", chat);
      socket.off("error", error);
      socket.off("participant_removed", removed);
    };
  }, [socket, roomId, navigate]);

  const emit = useCallback((event, payload = {}) => {
    socket.emit(event, { roomId, ...payload });
  }, [socket, roomId]);

  const shareLink = useMemo(() => `${window.location.origin}/room/${roomId}`, [roomId]);

  return (
    <main className="room-page">
      <section className="room-main">
        <header className="room-header">
          <div>
            <h1>Watch Room</h1>
            <span className="code">{roomId}</span>
          </div>
          <button className="secondary" onClick={() => navigator.clipboard.writeText(shareLink)}>
            <Copy size={16} />
            Copy link
          </button>
        </header>
        {notice && <div className="notice">{notice}</div>}
        <RequestBanner requests={requests} canResolve={canControl} onResolve={(requestId, approved) => emit("resolve_request", { requestId, approved })} />
        <VideoPlayer
          roomId={roomId}
          videoId={state.videoId}
          playState={state.playState}
          canControl={Boolean(canControl)}
          onPlay={(time) => emit("play", { time })}
          onPause={(time) => emit("pause", { time })}
          onSeek={(time) => emit("seek", { time })}
          onChangeVideo={(videoId) => emit("change_video", { videoId })}
          onRequestChange={(type, payload) => emit("request_change", { type, payload })}
          onRemoteReady={(remote) => {
            remoteRef.current = remote;
            const payload = pendingSyncRef.current;
            if (!payload) return;
            if (payload.playState === "playing") remote.play(payload.currentTime);
            else remote.pause(payload.currentTime);
          }}
        />
      </section>
      <aside className="sidebar">
        <ParticipantList
          participants={participants}
          selfId={self?.userId}
          isHost={Boolean(isHost)}
          onAssignRole={(userId, role) => emit("assign_role", { userId, role })}
          onRemove={(userId) => emit("remove_participant", { userId })}
          onTransferHost={(userId) => emit("transfer_host", { userId })}
        />
        <Chat messages={messages} onSend={(text) => emit("chat_message", { text })} />
      </aside>
    </main>
  );
}
