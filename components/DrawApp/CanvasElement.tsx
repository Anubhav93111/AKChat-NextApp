"use client";

import React, { useEffect } from 'react';
import { DrawingElement } from './types';

interface Props {
  elements: DrawingElement[];
  zoom: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function CanvasElement({ elements, zoom, canvasRef }: Props) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ✅ Fill canvas background with black
    // ctx.fillStyle = "#000000";
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.scale(zoom, zoom);

    elements.forEach((el) => {
      const stroke = el.strokeColor ?? "white";
      const lw = el.strokeWidth ?? 2;

      if (el.type === "text" && el.text && !el.isEditing) {
        ctx.font = "20px Arial";
        ctx.fillStyle = stroke;
        ctx.fillText(el.text, el.x1, el.y1);
        return;
      }

      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;

      if (el.type === "pencil" && el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0][0], el.points[0][1]);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i][0], el.points[i][1]);
        }
        ctx.stroke();
        return;
      }

      if (el.type === "line") {
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
        return;
      }

      if (el.type === "rectangle") {
        const left = Math.min(el.x1, el.x2);
        const top = Math.min(el.y1, el.y2);
        const w = Math.abs(el.x2 - el.x1);
        const h = Math.abs(el.y2 - el.y1);
        ctx.fillStyle = "#111111"; // ✅ fill before stroke
        ctx.fillRect(left, top, w, h);
        ctx.strokeRect(left, top, w, h);
        return;
      }

      if (el.type === "diamond") {
        const cx = (el.x1 + el.x2) / 2;
        const cy = (el.y1 + el.y2) / 2;
        const w = Math.abs(el.x2 - el.x1);
        const h = Math.abs(el.y2 - el.y1);
        ctx.beginPath();
        ctx.moveTo(cx, cy - h / 2);
        ctx.lineTo(cx + w / 2, cy);
        ctx.lineTo(cx, cy + h / 2);
        ctx.lineTo(cx - w / 2, cy);
        ctx.closePath();
        ctx.fillStyle = "#111111"; // ✅ fill before stroke
        ctx.fill();
        ctx.stroke();
        return;
      }

      if (el.type === "ellipse") {
        const cx = (el.x1 + el.x2) / 2;
        const cy = (el.y1 + el.y2) / 2;
        const rx = Math.abs(el.x2 - el.x1) / 2;
        const ry = Math.abs(el.y2 - el.y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#111111"; // ✅ fill before stroke
        ctx.fill();
        ctx.stroke();
        return;
      }
    });

    ctx.restore();
  }, [elements, zoom, canvasRef]);


  return (
    <canvas
  ref={canvasRef}
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 2,
  }}
/>
 
  );
}
