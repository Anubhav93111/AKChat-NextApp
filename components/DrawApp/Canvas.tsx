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
  const [remotePointers, setRemotePointers] = useState<Record<number, { x: number; y: number; name?: string; color: string; updatedAt: number }>>({});
  const [roomLockedBy, setRoomLockedBy] = useState<number | null>(null);
  const lastPointerEmitRef = useRef(0);
  const [ownColor, setOwnColor] = useState<string>(() => {
    // fallback random color until assigned uniquely
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}deg 80% 60%)`;
  });

  const emit = (payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && roomId && userId !== undefined) {
      wsRef.current.send(JSON.stringify({ ...payload, roomId, userId }));
    }
  };

  // removed custom local cursor - use native cursor

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // accept any object that has clientX/clientY to support React.Touch
  const getTouchCanvasCoordinates = (touch: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (touch.clientX - rect.left - pan.x) / zoom;
    const y = (touch.clientY - rect.top - pan.y) / zoom;
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

    const spacing = 30;
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

    // if another client has locked the room, prevent local drawing/moving
    if (roomLockedBy && roomLockedBy !== userId) return;

    if (mode === "draw") {
      // announce lock to other clients so they cannot draw while we are streaming
      try { emit({ type: "lock" }); } catch {}

      setDrawing(true);
      const element = createElement(x, y, x, y, elementType, strokeColor, strokeWidth);
      updateElements([...elements, element]);
      // broadcast that a new stream (start) has begun - index is last
      const index = elements.length;
      emit({ type: "stream", element, index, color: ownColor });
      // native cursor will be used; no custom local cursor update
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
    // emit pointer positions at most every 50ms
    try {
      const now = Date.now();
      if (now - lastPointerEmitRef.current > 50) {
        lastPointerEmitRef.current = now;
        emit({ type: "pointer", x, y, color: ownColor });
      }
    } catch {}
    // native cursor will be used; no custom local cursor update
  // if another client locked the room, don't update local drawing
  if (roomLockedBy && roomLockedBy !== userId) return;

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
          ...(el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond"
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

      // while drawing stream, broadcast incremental stream updates so others can preview
      emit({ type: "stream", element: updated, index, color: ownColor });
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
        // send finalized drawing only on mouse up
        emit({ type: "draw", element: finalizedElement });
        // release the lock so other clients can draw
        try { emit({ type: "unlock" }); } catch {}
      }
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    if (!event.ctrlKey) {
      setPan((p) => ({ x: p.x - event.deltaX, y: p.y - event.deltaY }));
      return;
    }

    if (!setZoom) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    const newZoom = Math.min(5, Math.max(0.2, zoom * zoomFactor));
    const scale = newZoom / zoom;

    setPan((p) => ({
      x: mouseX - (mouseX - p.x) * scale,
      y: mouseY - (mouseY - p.y) * scale,
    }));
    setZoom(newZoom);
  };

  useEffect(() => {
    const el = overlayCanvasRef.current;
    if (!el) return;

    const wheelHandler = (e: WheelEvent) => {
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

    el.addEventListener("wheel", wheelHandler, { passive: false });

    // add native touch listeners with passive: false so preventDefault works
    const touchPreventer = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchstart", touchPreventer, { passive: false });
    el.addEventListener("touchmove", touchPreventer, { passive: false });
    el.addEventListener("touchend", touchPreventer, { passive: false });

    return () => {
      el.removeEventListener("wheel", wheelHandler);
      el.removeEventListener("touchstart", touchPreventer as EventListener);
      el.removeEventListener("touchmove", touchPreventer as EventListener);
      el.removeEventListener("touchend", touchPreventer as EventListener);
    };
  }, [zoom, pan, setZoom]);

  // keep overlay canvas cursor in sync with mode/elementType by directly setting DOM style
  useEffect(() => {
    const el = overlayCanvasRef.current;
    if (!el) return;
    const cursor =
      mode === "move"
        ? "grab"
        : mode === "delete"
        ? "pointer"
        : elementType === "text"
        ? "text"
        : "crosshair";
    try {
      el.style.cursor = cursor;
    } catch {}
  }, [mode, elementType]);

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

  // --- Touch handling (single-finger draw/click, two-finger pinch zoom) ---
  const lastTouch = useRef<{ time: number; x: number; y: number } | null>(null);
  const pinchState = useRef<{ initialDistance: number; initialZoom: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // If this is a touch-capable device, we disable single-finger drawing to avoid accidental marks.
    if (e.touches.length === 1) {
      const t = e.touches[0];
      // still record lastTouch for tap detection (so clicks still work), but don't start drawing on single-touch
      lastTouch.current = { time: Date.now(), x: t.clientX, y: t.clientY };
      if (isTouchDeviceRef.current) {
        // intentionally skip starting a drawing session on mobile single-touch
        return;
      }

      // non-touch or desktop touch events (rare) may proceed to drawing
      const { x, y } = getTouchCanvasCoordinates(t);
      try { emit({ type: 'lock' }); } catch {}
      setDrawing(true);
      const element = createElement(x, y, x, y, elementType, strokeColor, strokeWidth);
      updateElements([...elements, element]);
      const index = elements.length;
      emit({ type: 'stream', element, index, color: ownColor });
      return;
    }

    if (e.touches.length === 2) {
      // start pinch (two-finger zoom) - keep this behavior
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pinchState.current = { initialDistance: dist, initialZoom: zoom };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Skip single-finger touch drawing on touch devices
    if (e.touches.length === 1 && isTouchDeviceRef.current) {
      // allow pointer updates for remote cursors (optional) but do not mutate drawings
      const t = e.touches[0];
      try {
        const now = Date.now();
        const { x, y } = getTouchCanvasCoordinates(t);
        if (now - lastPointerEmitRef.current > 50) {
          lastPointerEmitRef.current = now;
          emit({ type: 'pointer', x, y, color: ownColor });
        }
      } catch {}
      return;
    }

    if (e.touches.length === 1 && drawing && mode === 'draw') {
      // non-touch-device drawing (desktop touch or stylus) proceeds
      const t = e.touches[0];
      const { x, y } = getTouchCanvasCoordinates(t);

      try {
        const now = Date.now();
        if (now - lastPointerEmitRef.current > 50) {
          lastPointerEmitRef.current = now;
          emit({ type: 'pointer', x, y, color: ownColor });
        }
      } catch {}

      const index = elements.length - 1;
      const el = elements[index];
      if (!el) return;

      if (el.type === 'pencil') {
        const newPoints: [number, number][] = [...(el.points || []), [x, y]];
        const roughElement = generator.linearPath(newPoints, {
          stroke: el.strokeColor || '#ffffff',
          strokeWidth: el.strokeWidth || 2,
        });

        const updated = { ...el, points: newPoints, x2: x, y2: y, roughElement };
        const elementsCopy = [...elements];
        elementsCopy[index] = updated;
        setElements(elementsCopy);
      } else {
        const options = {
          stroke: el.strokeColor || '#ffffff',
          strokeWidth: el.strokeWidth || 2,
          ...(el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond'
            ? { fill: '#ae1c65ff', fillStyle: 'solid' }
            : {}),
        };

        let roughElement;
        switch (el.type) {
          case 'line':
            roughElement = generator.line(el.x1, el.y1, x, y, options);
            break;
          case 'rectangle':
            roughElement = generator.rectangle(el.x1, el.y1, x - el.x1, y - el.y1, options);
            break;
          case 'ellipse':
            roughElement = generator.ellipse((el.x1 + x) / 2, (el.y1 + y) / 2, Math.abs(x - el.x1), Math.abs(y - el.y1), options);
            break;
          case 'diamond':
            const midX = (el.x1 + x) / 2;
            const midY = (el.y1 + y) / 2;
            const diamondPoints = [[midX, el.y1], [x, midY], [midX, y], [el.x1, midY]] as Point[];
            roughElement = generator.polygon(diamondPoints, options);
            break;
          default:
            roughElement = null;
        }

        const updated = { ...el, x2: x, y2: y, roughElement };
        const elementsCopy = [...elements];
        elementsCopy[index] = updated;
        setElements(elementsCopy);
      }
    }

    if (e.touches.length === 2 && pinchState.current && setZoom) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / pinchState.current.initialDistance;
      const newZoom = Math.min(5, Math.max(0.2, pinchState.current.initialZoom * factor));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      // ended all touches -> treat as mouse up
      setDrawing(false);
      const finalizedElement = elements[elements.length - 1];
      if (mode === 'draw' && finalizedElement) {
        emit({ type: 'draw', element: finalizedElement });
        try { emit({ type: 'unlock' }); } catch {}
      }
      pinchState.current = null;
      // detect tap (short duration & small movement) to fire click
      if (lastTouch.current) {
        const dt = Date.now() - lastTouch.current.time;
        if (dt < 300) {
          // trigger click at that location
          const fakeEvent = { clientX: lastTouch.current.x, clientY: lastTouch.current.y } as unknown as React.MouseEvent<HTMLCanvasElement>;
          handleCanvasClick(fakeEvent);
        }
        lastTouch.current = null;
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
          ref.current.width = width;
          ref.current.height = height;
          ref.current.style.width = `${width}px`;
          ref.current.style.height = `${height}px`;
        }
      });

      drawGrid();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // color generator for pointer badges
  const colorForId = (id: number) => {
    const hue = (id * 137.5) % 360; // golden angle-ish distribution
    return `hsl(${hue}deg 80% 60%)`;
  };

  // generate a random HSL color; optional seeded variant
  const generateRandomColor = (seed?: number) => {
    if (typeof seed === "number") {
      const hue = Math.floor((seed * 137.5) % 360);
      return `hsl(${hue}deg 80% 60%)`;
    }
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}deg 80% 60%)`;
  };

  // pick a color not currently used by remote pointers
  const assignUniqueColor = () => {
    const used = new Set(Object.values(remotePointers).map((p) => p.color));
    let attempts = 0;
    let color = generateRandomColor(userId);
    while (used.has(color) && attempts < 50) {
      color = generateRandomColor();
      attempts++;
    }
    setOwnColor(color);
    try {
      emit({ type: "color", color });
    } catch {}
  };

  // detect touch-capable devices so we can selectively disable single-finger touch drawing
  const isTouchDeviceRef = React.useRef(false);
  useEffect(() => {
    try {
      isTouchDeviceRef.current = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    } catch (e) {
      isTouchDeviceRef.current = false;
    }
  }, []);
  // listen for pointer messages from websocket
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const handler = (ev: MessageEvent) => {
      try {
          const msg = JSON.parse(ev.data as string);
          // handle drawing sync/stream/init and lock/unlock messages
          if (msg.type === 'sync' && Array.isArray(msg.shapes)) {
            // server authoritative sync of all shapes - sanitize null/invalid entries
            const safe = (msg.shapes as unknown[]).filter((s): s is DrawingElement => !!s && typeof s === 'object');
            setElements(safe as DrawingElement[]);
            return;
          }
          if (msg.type === 'init' && Array.isArray(msg.shapes)) {
            const safe = (msg.shapes as unknown[]).filter((s): s is DrawingElement => !!s && typeof s === 'object');
            setElements(safe as DrawingElement[]);
            return;
          }
          if (msg.type === 'stream' && typeof msg.index === 'number' && msg.element) {
            // ignore our own streams
            if (msg.userId === userId) return;
            const incoming = msg.element;
            if (!incoming || typeof incoming !== 'object') return;
            updateElements((prev) => {
              const copy = [...prev];
              const idx = Number(msg.index);
              if (idx < 0) return copy;
              if (idx === copy.length) {
                copy.push(incoming as DrawingElement);
              } else if (idx < copy.length) {
                copy[idx] = incoming as DrawingElement;
              } else {
                // fill the gap with existing items or skip to avoid sparse arrays; push to reach index
                while (copy.length < idx) copy.push(undefined as unknown as DrawingElement);
                copy[idx] = incoming as DrawingElement;
              }
              // remove any accidental nulls
              return copy.filter((c) => c && typeof c === 'object');
            });
            return;
          }
          if (msg.type === 'lock') {
            // someone locked the room — prevent drawing locally
            setRoomLockedBy(typeof msg.lockedBy === 'number' ? msg.lockedBy : null);
            return;
          }
          if (msg.type === 'unlock') {
            setRoomLockedBy(null);
            return;
          }
          if (msg.type === "pointer" && typeof msg.x === "number" && typeof msg.y === "number" && msg.userId !== undefined) {
            const id = Number(msg.userId);
            setRemotePointers((prev) => ({
              ...prev,
              [id]: {
                x: msg.x as number,
                y: msg.y as number,
                name: (msg.name as string) || undefined,
                color: (msg.color as string) || prev[id]?.color || colorForId(id),
                updatedAt: Date.now(),
              },
            }));
          }
          if (msg.type === 'color' && msg.userId !== undefined && typeof msg.color === 'string') {
            const id = Number(msg.userId);
            setRemotePointers((prev) => ({
              ...prev,
              [id]: {
                x: prev[id]?.x ?? 0,
                y: prev[id]?.y ?? 0,
                name: prev[id]?.name,
                color: msg.color as string,
                updatedAt: Date.now(),
              },
            }));
          }
      } catch (e) {
        // ignore non-json messages
      }
    };

    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [wsRef, updateElements, userId]);

  // assign a unique color on mount and whenever remotePointers change cause a conflict
  useEffect(() => {
    assignUniqueColor();
    // if remotePointers later contains our color, reassign
  }, []);

  useEffect(() => {
    if (!ownColor) return;
    const conflict = Object.values(remotePointers).some((p) => p.color === ownColor);
    if (conflict) {
      assignUniqueColor();
    }
  }, [remotePointers]);

  return (
    <div ref={containerRef} className="app-container">
      <canvas ref={gridCanvasRef} className="full-canvas" />

      <CanvasElement
        elements={elements}
        zoom={zoom}
        panX={pan.x}
        panY={pan.y}
        canvasRef={drawingCanvasRef}
      />

      <canvas
        ref={overlayCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCanvasClick}
        className="overlay-canvas"
      />

        {/* ensure overlay canvas cursor matches current mode even if external CSS interferes */}
        <>
          {/** update DOM cursor style directly to override potential external cursors **/}
          {null}
        </>

      {/* remote pointers overlay */}
      {Object.entries(remotePointers).map(([id, p]) => {
        const pid = Number(id);
        // don't render our own pointer here; we'll render our local cursor separately
        if (pid === userId) return null;
        const screenX = p.x * zoom + pan.x;
        const screenY = p.y * zoom + pan.y;
        return (
          <div
            key={pid}
            style={{
              position: "absolute",
              left: `${screenX}px`,
              top: `${screenY}px`,
              transform: "translate(-50%, -120%)",
              pointerEvents: "none",
              zIndex: 3,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: p.color,
                boxShadow: "0 0 6px rgba(0,0,0,0.6)",
              }}
            />
            {p.name ? (
              <div
                style={{
                  marginTop: 6,
                  padding: "2px 6px",
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  borderRadius: 6,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* native cursor is used for local user; no custom local cursor rendered */}

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