import { Pause, Play } from "lucide-react";
import { formatTime } from "../utils/youtube";

export function ControlBar({ canPlayPause, playing, currentTime, duration, onPlayPause, onSeek }) {
  return (
    <div className="control-bar">
      <button className="icon-button" disabled={!canPlayPause} onClick={onPlayPause} title={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <span>{formatTime(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        value={Math.min(currentTime, duration || currentTime)}
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <span>{formatTime(duration)}</span>
    </div>
  );
}
