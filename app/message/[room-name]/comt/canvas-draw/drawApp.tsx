// comt/canvas-draw/drawApp.tsx
"use client";

import React, { useState } from "react";
import Toolbar from "@/components/DrawApp/ToolBar";
import Canvas from "@/components/DrawApp/Canvas";
import { useRoomSocket } from "@/lib/hooks/useRoomSocket";



type ElementType = "line" | "rectangle" | "diamond" | "ellipse" | "pencil" | "text";
type Mode = "draw" | "move" | "delete";

interface DrawingElement {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: ElementType;
  roughElement: any;
  points?: [number, number][];
  text?: string;
  isEditing?: boolean;
}

export default function DrawApp() {
  const { socketRef, roomId, userId, authorized } = useRoomSocket();

  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [elementType, setElementType] = useState<ElementType>("line");
  const [mode, setMode] = useState<Mode>("draw");
  const [history, setHistory] = useState<DrawingElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingElement[][]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [textValue, setTextValue] = useState("");
  const [zoom, setZoom] = useState(1);
  const [strokeColor, setStrokeColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Listen for drawing sync events from server
  React.useEffect(() => {
    const ws = socketRef?.current;
    if (!authorized || !ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "init" && Array.isArray(data.shapes)) {
          setElements(data.shapes);
        } else if (data.type === "sync" && Array.isArray(data.shapes)) {
          setElements(data.shapes);
        } else if (data.type === "stream" && data.element && typeof data.index === "number") {
          setElements((prev) => {
            const next = [...prev];
            next[data.index] = data.element;
            return next;
          });
        }
      } catch {
        // ignore non-JSON or unrelated messages
      }
    };

    ws.addEventListener("message", handleMessage as EventListener);
    return () => ws.removeEventListener("message", handleMessage as EventListener);
  }, [authorized, socketRef]);

  const updateElements = (
    updater: DrawingElement[] | ((prev: DrawingElement[]) => DrawingElement[])
  ) => {
    setElements((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  const handleClear = () => {
    updateElements([]);
    const ws = socketRef?.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "clear" }));
  };

  // when authorized and socket is open, request init shapes from server
  React.useEffect(() => {
    const ws = socketRef?.current;
    if (!authorized || !ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'init' }));
    } else {
      const onOpen = () => ws.send(JSON.stringify({ type: 'init' }));
      ws.addEventListener('open', onOpen as EventListener);
      return () => ws.removeEventListener('open', onOpen as EventListener);
    }
  }, [authorized, socketRef]);

  const onUndo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setRedoStack((r) => [elements, ...r]);
      setElements(prev);
      return h.slice(0, -1);
    });
  };

  const onRedo = () => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[0];
      setHistory((h) => [...h, elements]);
      setElements(next);
      return r.slice(1);
    });
  };

  return (
    <>
  {/* Toolbar floats above everything */}
  <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50">
    <Toolbar
      elementType={elementType}
      setElementType={setElementType}
      mode={mode}
      setMode={setMode}
      historyLength={history.length}
      redoLength={redoStack.length}
      onUndo={onUndo}
      onRedo={onRedo}
      onClear={handleClear}
      zoom={zoom}
      setZoom={setZoom}
      strokeColor={strokeColor}
      setStrokeColor={setStrokeColor}
      strokeWidth={strokeWidth}
      setStrokeWidth={setStrokeWidth}
    />
  </div>

  {/* Canvas fills the screen behind toolbar */}
  <Canvas
    elementType={elementType}
    mode={mode}
    elements={elements}
    setElements={setElements}
    updateElements={updateElements}
    editingIndex={editingIndex}
    setEditingIndex={setEditingIndex}
    textValue={textValue}
    setTextValue={setTextValue}
    zoom={zoom}
    setZoom={setZoom}
    strokeColor={strokeColor}
    strokeWidth={strokeWidth}
    wsRef={socketRef}
    roomId={roomId}
    userId={userId}
  />
</>
  );
}
