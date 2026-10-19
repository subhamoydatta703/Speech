"use client";
import { useState } from "react";

export function DictationDemo() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="demo-wrap">
      <div className="editor">
        <div className="editor-toolbar">
          <span className="window-dots">● ● ●</span>
          <span>A little room for big ideas</span>
          <span>↗</span>
        </div>
        <div className="editor-body">
          <span className="eyebrow">A FRESH PAGE</span>
          <h2>It starts with a thought.</h2>
          <p>
            {playing
              ? "What if I spent less time typing, and more time thinking? A quick note. The first draft. That idea I don’t want to lose."
              : "A quick note. The first draft. That idea I don’t want to lose."}
            <span className="caret" />
          </p>
          <div className="editor-line" />
          <div className="editor-line short" />
        </div>
        <div className="editor-footer">
          <span>Just you and your next idea.</span>
          <span>Plain text</span>
        </div>
      </div>
      <button
        className={`voice-pill ${playing ? "playing" : ""}`}
        onClick={() => setPlaying(!playing)}
        aria-pressed={playing}
      >
        <span className="mic-dot" aria-hidden="true">
          ●
        </span>
        <span className="wave" aria-hidden="true">
          {Array.from({ length: 17 }, (_, i) => (
            <i
              key={i}
              style={{
                height: `${8 + ((i * 13) % 25)}px`,
                animationDelay: `${i * 65}ms`,
              }}
            />
          ))}
        </span>
        <span>{playing ? "Pause preview" : "Play preview"}</span>
        <span className="key">↵</span>
      </button>
      <p className="demo-caption" aria-live="polite">
        Interactive illustration · No microphone is used
      </p>
    </div>
  );
}
