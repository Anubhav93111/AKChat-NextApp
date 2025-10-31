"use client";

import React, { useRef, useState, useEffect } from "react";
import CanvasElement from "./CanvasElement";
import CanvasTextEditor from "./CanvasTextEditor";
import { DrawingElement, ElementType, Mode } from "./types";
import rough from "roughjs/bin/rough";
import { Point } from "roughjs/bin/geometry";

const generator = rough.generator();

interface Props {
  elementType: ElementType;
  mode: Mode;
  elements: DrawingElement[];
  setElements: (els: DrawingElement[]) => void;
  updateElements: (
    els: DrawingElement[] | ((prev: DrawingElement[]) => DrawingElement[])
  ) => void;
  editingIndex: number | null;
  setEditingIndex: (i: number | null) => void;
  textValue: string;
  setTextValue: (s: string) => void;
  zoom: number;
  setZoom?: (z: number) => void;
  strokeColor: string;
  strokeWidth: number;
  wsRef: React.MutableRefObject<WebSocket | null>;
  roomId: string | null;
  userId: number | undefined;
}

export default function Canvas({
  elementType,
  mode,
  elements,
  setElements,
  updateElements,
  editingIndex,
  setEditingIndex,
  textValue,
  setTextValue,
  zoom,
  setZoom,
  strokeColor,
  strokeWidth,
  wsRef,
  roomId,
  userId,
}: Props) {
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [drawing, setDrawing] = useState(false);
  const [movingElementIndex, setMovingElementIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const [originalElement, setOriginalElement] = useState<DrawingElement | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const emit = (payload: any) => {
    if (wsRef && wsRef.current?.readyState === WebSocket.OPEN && roomId && userId !== undefined) {
      wsRef.current?.send(JSON.stringify({ ...payload, roomId, userId }));
    }
  };

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const drawGrid = () => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const spacing = 30; // 🔹 Fixed small grid spacing

    ctx.strokeStyle = "rgba(13, 255, 0, 0.08)";
    ctx.lineWidth = 2;

    for (let x = 0; x <= width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawGrid();
  }, []);

  const createElement = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: ElementType,
    strokeColor?: string,
    strokeWidth?: number
  ): DrawingElement => {
    switch (type) {
      case "pencil":
        return {
          x1,
          y1,
          x2,
          y2,
          type,
          roughElement: null,
          points: [[x1, y1], [x2, y2]],
          strokeColor,
          strokeWidth,
        };
      case "text":
        return {
          x1,
          y1,
          x2: x1,
          y2: y1,
          type,
          roughElement: null,
          text: "",
          isEditing: true,
          strokeColor,
          strokeWidth,
        };
      default:
        return {
          x1,
          y1,
          x2,
          y2,
          type,
          roughElement: null,
          strokeColor,
          strokeWidth,
        };
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);

    if (mode === "draw") {
      setDrawing(true);
      const element = createElement(x, y, x, y, elementType, strokeColor, strokeWidth);
      updateElements([...elements, element]);
    }

    if (mode === "move") {
      const hitIndex = elements.findIndex((el) => isPointInsideElement(x, y, el));
      if (hitIndex !== -1) {
        const el = elements[hitIndex];
        setMovingElementIndex(hitIndex);
        setDragOffset({ dx: x - el.x1, dy: y - el.y1 });
        setOriginalElement(el);
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);

    if (drawing && mode === "draw") {
      const index = elements.length - 1;
      const el = elements[index];
      if (!el) return;

      let updated: DrawingElement;

      if (el.type === "pencil") {
        const newPoints: [number, number][] = [...(el.points || []), [x, y]];
        const roughElement = generator.linearPath(newPoints, {
          stroke: el.strokeColor || "#ffffff",
          strokeWidth: el.strokeWidth || 2,
        });

        updated = {
          ...el,
          points: newPoints,
          x2: x,
          y2: y,
          roughElement,
        };
      } else {
        const options = {
          stroke: el.strokeColor || "#ffffff",
          strokeWidth: el.strokeWidth || 2,
          ...(el.type === "rectangle" ||
            el.type === "ellipse" ||
            el.type === "diamond"
            ? {
              fill: "#ae1c65ff",
              fillStyle: "solid",
            }
            : {}),
        };

        let roughElement;
        switch (el.type) {
          case "line":
            roughElement = generator.line(el.x1, el.y1, x, y, options);
            break;
          case "rectangle":
            roughElement = generator.rectangle(el.x1, el.y1, x - el.x1, y - el.y1, options);
            break;
          case "ellipse":
            roughElement = generator.ellipse(
              (el.x1 + x) / 2,
              (el.y1 + y) / 2,
              Math.abs(x - el.x1),
              Math.abs(y - el.y1),
              options
            );
            break;
          case "diamond":
            const midX = (el.x1 + x) / 2;
            const midY = (el.y1 + y) / 2;
            const diamondPoints: Point[] = [
              [midX, el.y1],
              [x, midY],
              [midX, y],
              [el.x1, midY],
            ];

            roughElement = generator.polygon(diamondPoints, options);
            break;
          case "text":
            roughElement = null;
            break;
          default:
            roughElement = null;
        }

        updated = {
          ...el,
          x2: x,
          y2: y,
          roughElement,
        };
      }

      const elementsCopy = [...elements];
      elementsCopy[index] = updated;
      setElements(elementsCopy);

      emit({ type: "stream", element: updated, index });
    }



    if (mode === "move" && movingElementIndex !== null && dragOffset && originalElement) {
      const { dx, dy } = dragOffset;
      const newX1 = x - dx;
      const newY1 = y - dy;
      const deltaX = newX1 - originalElement.x1;
      const deltaY = newY1 - originalElement.y1;
      const newX2 = originalElement.x2 + deltaX;
      const newY2 = originalElement.y2 + deltaY;

      let updated: DrawingElement;
      if (originalElement.type === "pencil" && originalElement.points) {
        const shiftedPoints = originalElement.points.map(([px, py]) => [
          px + deltaX,
          py + deltaY,
        ] as [number, number]);
        updated = {
          ...originalElement,
          x1: newX1,
          y1: newY1,
          x2: newX2,
          y2: newY2,
          points: shiftedPoints,
        };
      } else {
        updated = {
          ...originalElement,
          x1: newX1,
          y1: newY1,
          x2: newX2,
          y2: newY2,
        };
      }

      const elementsCopy = [...elements];
      elementsCopy[movingElementIndex] = updated;
      setElements(elementsCopy);

      emit({ type: "move", element: updated, index: movingElementIndex });
    }
  };

  const handleMouseUp = () => {
    setDrawing(false);
    setMovingElementIndex(null);
    setDragOffset(null);
    setOriginalElement(null);

    if (mode === "draw") {
      const finalizedElement = elements[elements.length - 1];
      if (finalizedElement) {
        emit({ type: "draw", element: finalizedElement });
      }
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    // Two-finger pan or mouse wheel pan
    if (!event.ctrlKey) {
      if ((event as any).preventDefault) (event as any).preventDefault();
      setPan((p) => ({ x: p.x - event.deltaX, y: p.y - event.deltaY }));
      return;
    }
    // Pinch-to-zoom (Ctrl+wheel)
    if (!setZoom) return;
    if ((event as any).preventDefault) (event as any).preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = Math.exp(-event.deltaY * 0.0015); // smooth
    const newZoom = Math.min(5, Math.max(0.2, zoom * zoomFactor));
    const scale = newZoom / zoom;

    // Keep the point under cursor stable: adjust pan accordingly
    setPan((p) => ({
      x: mouseX - (mouseX - p.x) * scale,
      y: mouseY - (mouseY - p.y) * scale,
    }));
    setZoom(newZoom);
  };

  // Ensure browser doesn't page-zoom or scroll when interacting with canvas (non-passive listener)
  useEffect(() => {
    const el = overlayCanvasRef.current;
    if (!el) return;
    const wheelHandler = (e: WheelEvent) => {
      // Prevent browser zoom/scroll and apply our pan/zoom
      e.preventDefault();
      if (!e.ctrlKey) {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        return;
      }
      if (!setZoom) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomFactor = Math.exp(-e.deltaY * 0.0015);
      const newZoom = Math.min(5, Math.max(0.2, zoom * zoomFactor));
      const scale = newZoom / zoom;
      setPan((p) => ({
        x: mouseX - (mouseX - p.x) * scale,
        y: mouseY - (mouseY - p.y) * scale,
      }));
      setZoom(newZoom);
    };
    el.addEventListener('wheel', wheelHandler, { passive: false });
    return () => el.removeEventListener('wheel', wheelHandler as EventListener);
  }, [zoom, pan, setZoom]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);

    if (mode === "draw" && elementType === "text") {
      const newElement: DrawingElement = {
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        type: "text",
        roughElement: null,
        text: "",
        isEditing: true,
        strokeColor,
        strokeWidth,
      };
      updateElements([...elements, newElement]);
      setEditingIndex(elements.length);
      setTextValue("");
    }

    if (mode === "delete") {
      const hitIndex = elements.findIndex((el) => isPointInsideElement(x, y, el));
      if (hitIndex !== -1) {
        const updated = elements.filter((_, i) => i !== hitIndex);
        updateElements(updated);
        emit({ type: "delete", index: hitIndex });
      }
    }
  };

  const isPointInsideElement = (x: number, y: number, el: DrawingElement) => {
    const buffer = 5;
    if (el.type === "pencil" && el.points) {
      return el.points.some(([px, py]) => {
        const dx = x - px;
        const dy = y - py;
        return dx * dx + dy * dy <= buffer * buffer;
      });
    }
    const left = Math.min(el.x1, el.x2) - buffer;
    const right = Math.max(el.x1, el.x2) + buffer;
    const top = Math.min(el.y1, el.y2) - buffer;
    const bottom = Math.max(el.y1, el.y2) + buffer;
    return x >= left && x <= right && y >= top && y <= bottom;
  };
useEffect(() => {
  const resizeCanvas = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    [gridCanvasRef, drawingCanvasRef, overlayCanvasRef].forEach((ref) => {
      if (ref.current) {
        // Set canvas drawing dimensions
        ref.current.width = width;
        ref.current.height = height;

        // Set canvas CSS dimensions
        ref.current.style.width = `${width}px`;
        ref.current.style.height = `${height}px`;
      }
    });

    drawGrid(); // Redraw grid after resizing
  };

  resizeCanvas(); // Initial sizing
  window.addEventListener("resize", resizeCanvas);

  return () => {
    window.removeEventListener("resize", resizeCanvas);
  };
}, []);

 return (
  <div
    ref={containerRef}
   style={{
  position: "fixed", // ✅ anchors to viewport
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "black",
  overflow: "hidden",
  zIndex: 0, // ✅ sits behind toolbar
}}
  >
    {/* Grid Canvas */}
    <canvas
      ref={gridCanvasRef}
      style={{
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 1, // or 2 for overlay
}}

    />

    {/* Drawing Canvas */}
    <CanvasElement elements={elements} zoom={zoom} panX={pan.x} panY={pan.y} canvasRef={drawingCanvasRef} />

    {/* Overlay Canvas */}
    <canvas
      ref={overlayCanvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      style={{
        position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
        cursor:
          mode === "move"
            ? "grab"
            : mode === "delete"
            ? "pointer"
            : elementType === "text"
            ? "text"
            : "crosshair",
        zIndex: 2,
        touchAction: "none",
      }}
    />

    <CanvasTextEditor
      editingIndex={editingIndex}
      elements={elements}
      textValue={textValue}
      setTextValue={setTextValue}
      setEditingIndex={setEditingIndex}
      updateElements={updateElements}
      canvasRef={drawingCanvasRef}
    />
  </div>
);  
}
