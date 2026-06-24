"use client";

import { useEffect, useRef } from "react";

const NUMBERS = ["800", "750", "720", "680", "300", "850", "640", "590", "710", "780", "530", "660", "490", "810", "740"];

export function HeroDataStream() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resize();
    window.addEventListener("resize", resize);

    const cols = Math.floor(canvas.offsetWidth / 36);

    const w = canvas.offsetWidth;
    const streams = Array.from({ length: cols }, (_, i) => {
      const xPos = i * 36 + 18;
      // Left side (lime/dark) needs higher opacity, right side (cyan/light) needs lower
      const xPct = xPos / w;
      const baseOpacity = 0.18 - xPct * 0.10; // 0.18 on left → 0.08 on right
      return {
        x: xPos,
        y: Math.random() * -canvas.offsetHeight,
        speed: 0.4 + Math.random() * 0.6,
        opacity: baseOpacity + Math.random() * 0.06,
        numbers: Array.from({ length: 20 }, () => NUMBERS[Math.floor(Math.random() * NUMBERS.length)]),
        spacing: 22,
        xPct,
      };
    });

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      for (const stream of streams) {
        for (let i = 0; i < stream.numbers.length; i++) {
          const y = stream.y + i * stream.spacing;
          if (y < -stream.spacing || y > canvas.offsetHeight + stream.spacing) continue;

          // Head of stream is brighter
          const isHead = i === 0;
          const alpha = isHead ? stream.opacity * 2.5 : stream.opacity * (1 - i / stream.numbers.length);

          ctx.font = `${isHead ? "bold " : ""}11px 'SF Mono', 'Fira Code', monospace`;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillText(stream.numbers[i], stream.x, y);
        }

        stream.y += stream.speed;

        if (stream.y > canvas.offsetHeight) {
          stream.y = -stream.numbers.length * stream.spacing;
          stream.numbers = Array.from({ length: 20 }, () => NUMBERS[Math.floor(Math.random() * NUMBERS.length)]);
          stream.speed = 0.4 + Math.random() * 0.6;
          const baseOpacity = 0.18 - stream.xPct * 0.10;
          stream.opacity = baseOpacity + Math.random() * 0.06;
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9 }}
    />
  );
}
