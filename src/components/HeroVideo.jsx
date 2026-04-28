'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

const VIDEOS = ['/hero-video.mp4', '/hero-video-2.mp4'];
const CROSSFADE_DURATION = 1200; // ms

export function HeroVideo() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const refs = [useRef(null), useRef(null)];

  const next = active === 0 ? 1 : 0;

  const handleEnded = useCallback(() => {
    const nextIndex = active === 0 ? 1 : 0;
    const nextVid = refs[nextIndex].current;
    if (!nextVid) return;

    nextVid.currentTime = 0;
    nextVid.play().catch(() => {});
    setFading(true);

    setTimeout(() => {
      setActive(nextIndex);
      setFading(false);
    }, CROSSFADE_DURATION);
  }, [active]);

  useEffect(() => {
    const vid = refs[active].current;
    if (!vid) return;
    vid.play().catch(() => {});
  }, [active]);

  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      {/* Fallback shown before first video loads */}
      <div className="absolute inset-0 bg-gradient-to-br from-obsidian via-[#0d0d10] to-[#13110a]" />

      {VIDEOS.map((src, i) => (
        <video
          key={src}
          ref={refs[i]}
          src={src}
          muted
          playsInline
          preload={i === 0 ? 'auto' : 'metadata'}
          aria-hidden="true"
          onEnded={i === active ? handleEnded : undefined}
          className="absolute inset-0 w-full h-full object-cover transition-opacity"
          style={{
            opacity: i === active ? (fading ? 0 : 0.6) : fading ? 0.6 : 0,
            transitionDuration: `${CROSSFADE_DURATION}ms`,
            transitionTimingFunction: 'ease-in-out',
          }}
        />
      ))}
    </div>
  );
}
