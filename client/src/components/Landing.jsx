import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clapperboard, LogIn, Plus, ShieldCheck, UserRound, Users, Video } from "lucide-react";

const serverUrl = import.meta.env.URL ?? "https://youtube-watch-party-to2q.onrender.com";
const tokenKey = "token";
const guestIdKey = "guestId";

function guestId() {
  let id = localStorage.getItem(guestIdKey);
  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(guestIdKey, id);
  }
  return id;
}

function clearSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem("username");
  document.cookie = `${tokenKey}=; path=/; max-age=0; samesite=lax`;
}

function saveSession(token, username) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem("username", username);
  document.cookie = `${tokenKey}=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
}

function savedToken() {
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${tokenKey}=`))
    ?.split("=")[1];
  return localStorage.getItem(tokenKey) || (cookieToken ? decodeURIComponent(cookieToken) : "");
}

export function Landing() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState("");
  const [joinChoice, setJoinChoice] = useState(false);
  const [pendingRoom, setPendingRoom] = useState("");

  const auth = async (mode) => {
    const cleanUsername = username.trim();
    if (cleanUsername.length < 2) throw new Error("Enter a username");
    if (password.length < 4) throw new Error("Enter a 4+ character password");
    const res = await fetch(`${serverUrl}/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanUsername, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Authentication failed");
    saveSession(data.token, data.user.username);
  };

  const loginOrRegister = async () => {
    await auth("login").catch(() => auth("register"));
  };

  const registerOrLogin = async () => {
    await auth("register").catch(() => auth("login"));
  };

  const ensureAuth = async () => {
    const token = savedToken();
    if (token) {
      localStorage.setItem(tokenKey, token);
      return;
    }
    await registerOrLogin();
  };

  const requestRoom = async () => {
    const token = savedToken();
    return fetch(`${serverUrl}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ guestId: guestId() })
    });
  };

  const createRoom = async () => {
    try {
      setMessage("");
      const wantsLogin = username.trim() || password;
      if (wantsLogin) await ensureAuth();
      else {
        clearSession();
        localStorage.setItem("username", "Guest");
      }
      let res = await requestRoom();
      if (res.status === 401) {
        localStorage.removeItem(tokenKey);
        await loginOrRegister();
        res = await requestRoom();
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not create room");
      navigate(`/room/${data.roomId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const openJoinOptions = () => {
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    setPendingRoom(code);
    setJoinChoice(true);
    setMessage("");
  };

  const continueAsGuest = () => {
    clearSession();
    localStorage.setItem("username", username.trim() || "Guest");
    navigate(`/room/${pendingRoom}`);
  };

  const joinWithLogin = async () => {
    try {
      await loginOrRegister();
      navigate(`/room/${pendingRoom}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    }
  };

  return (
    <main className="landing">
      <section className="landing-panel">
        <div className="landing-copy">
          <div className="brand-mark">
            <Clapperboard size={22} />
            Watch Sync
          </div>
          <h1>YouTube Watch Party</h1>
          <p>Room banao, friends ko code bhejo, aur video controls clean tareeke se synced rakho.</p>
          <div className="feature-strip">
            <span><Video size={16} /> Synced video</span>
            <span><Users size={16} /> Live roles</span>
            <span><ShieldCheck size={16} /> Host approval</span>
          </div>
        </div>

        <div className="auth-panel">
          <div className="panel-heading">
            <h2>Start watching</h2>
            <p>Create a room with login, or join with a room code.</p>
          </div>

          <div className="stack">
            <div className="mode-card">
              <strong>Host a new room</strong>
              <span>Login/register required so your room has a fixed host.</span>
            </div>
            <label>
              <span>Username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter username" autoComplete="username" />
            </label>
            <label>
              <span>Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="4+ characters" type="password" />
            </label>
            <div className="button-row">
              <button onClick={createRoom}><Plus size={16} />Create room</button>
              <button className="login-button" onClick={() => loginOrRegister().then(() => setMessage("Logged in")).catch((error) => setMessage(error instanceof Error ? error.message : "Login failed"))}><LogIn size={16} />Login</button>
            </div>
            <div className="join-card">
              <input value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="Enter room code" />
              <button className="secondary" onClick={openJoinOptions}>Join</button>
            </div>
            {message && <p className="notice">{message}</p>}
          </div>
        </div>
      </section>
      {joinChoice && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="join-modal">
            <div className="panel-heading">
              <h2>Join room {pendingRoom}</h2>
              <p>Choose how you want to enter this watch party.</p>
            </div>
            <div className="choice-grid">
              <button onClick={joinWithLogin}><LogIn size={18} />Login and join</button>
              <button className="secondary" onClick={continueAsGuest}><UserRound size={18} />Continue as guest</button>
            </div>
            <button className="ghost" onClick={() => setJoinChoice(false)}>Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}
