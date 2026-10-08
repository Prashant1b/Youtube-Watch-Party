import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { ControlBar } from "./ControlBar";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { extractYouTubeId } from "../utils/youtube";

export function VideoPlayer({ videoId, canControl, playState, onPlay, onPause, onSeek, onChangeVideo, onRequestChange, onRemoteReady }) {
  const [url, setUrl] = useState("");
  const player = useYouTubePlayer(videoId, (state) => {
    if (state === "playing") onPlay(player.currentTime);
    if (state === "paused") onPause(player.currentTime);
  });

  useEffect(() => {
    onRemoteReady(player.remote);
  }, [player.remote, onRemoteReady]);

  const submitVideo = () => {
    const nextId = extractYouTubeId(url);
    if (!nextId) return;
    if (canControl) onChangeVideo(nextId);
    else onRequestChange("video", { videoId: nextId });
    setUrl("");
  };

  const seek = (time) => {
    if (canControl) onSeek(time);
    else onRequestChange("seek", { time });
  };

  return (
    <section className="video-shell">
      <div className="player-frame">
        <div ref={player.containerRef} />
      </div>
      <ControlBar
        disabled={!canControl}
        playing={playState === "playing"}
        currentTime={player.currentTime}
        duration={player.duration}
        onPlayPause={() => playState === "playing" ? onPause(player.currentTime) : onPlay(player.currentTime)}
        onSeek={seek}
      />
      <div className="video-form">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste a YouTube URL" />
        <button onClick={submitVideo}>
          <Send size={16} />
          {canControl ? "Change video" : "Request change"}
        </button>
      </div>
    </section>
  );
}
