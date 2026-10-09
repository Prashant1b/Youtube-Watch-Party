import { useEffect, useMemo, useRef, useState } from "react";

let apiReady = null;

function loadApi() {
  if (apiReady) return apiReady;
  apiReady = new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });
  return apiReady;
}

export function useYouTubePlayer(videoId, onStateChange) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const suppressRef = useRef(false);
  const readyRef = useRef(false);
  const queuedCommandRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const runWhenReady = (command) => {
    if (readyRef.current && playerRef.current?.seekTo) {
      command(playerRef.current);
      return;
    }
    queuedCommandRef.current = command;
  };

  useEffect(() => {
    loadApi().then(() => {
      if (!containerRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { controls: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            readyRef.current = true;
            setDuration(playerRef.current.getDuration() || 0);
            queuedCommandRef.current?.(playerRef.current);
            queuedCommandRef.current = null;
          },
          onStateChange: (event) => {
            if (suppressRef.current) return;
            if (event.data === window.YT.PlayerState.PLAYING) onStateChange("playing");
            if (event.data === window.YT.PlayerState.PAUSED) onStateChange("paused");
          }
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current?.loadVideoById) return;
    suppressRef.current = true;
    playerRef.current.loadVideoById(videoId);
    playerRef.current.pauseVideo();
    setTimeout(() => {
      suppressRef.current = false;
      setDuration(playerRef.current?.getDuration?.() || 0);
    }, 600);
  }, [videoId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return;
      setCurrentTime(playerRef.current.getCurrentTime() || 0);
      setDuration(playerRef.current.getDuration() || 0);
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const remote = useMemo(() => ({
    play(time) {
      suppressRef.current = true;
      runWhenReady((player) => {
        if (typeof time === "number") player.seekTo(time, true);
        player.playVideo();
      });
      setTimeout(() => { suppressRef.current = false; }, 400);
    },
    pause(time) {
      suppressRef.current = true;
      runWhenReady((player) => {
        if (typeof time === "number") player.seekTo(time, true);
        player.pauseVideo();
      });
      setTimeout(() => { suppressRef.current = false; }, 400);
    },
    seek(time) {
      suppressRef.current = true;
      runWhenReady((player) => player.seekTo(time, true));
      setCurrentTime(time);
      setTimeout(() => { suppressRef.current = false; }, 400);
    }
  }), []);

  return { containerRef, currentTime, duration, remote };
}
