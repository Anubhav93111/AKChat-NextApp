'use client';
import { useEffect, useRef } from 'react';

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const trail: { x: number; y: number; alpha: number }[] = [];
    let mouseX = 0;
    let mouseY = 0;

    const handleMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      trail.push({ x: mouseX, y: mouseY, alpha: 1 });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      trail.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${dot.alpha})`; // teal-400
        ctx.fill();
        dot.alpha -= 0.02;
      });

      // Remove faded dots
      while (trail.length > 0 && trail[0].alpha <= 0) {
        trail.shift();
      }

      requestAnimationFrame(draw);
    };

    window.addEventListener('mousemove', handleMove);
    draw();

    return () => {
      window.removeEventListener('mousemove', handleMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
    />
  );
}