"use client";

import React, { useRef, useState, useEffect } from 'react';
import CanvasElement from './CanvasElement';
import CanvasTextEditor from './CanvasTextEditor';
import { DrawingElement, ElementType, Mode } from './types';
import rough from 'roughjs/bin/rough';

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
  strokeColor: string;
  strokeWidth: number;
  ws: React.MutableRefObject<WebSocket | null>;

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
  strokeColor,
  strokeWidth,
  ws,
}: Props) {
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // use the provided socketRef from props (do not create a new connection)
  const socketRef = ws;

  const [drawing, setDrawing] = useState(false);
  const [movingElementIndex, setMovingElementIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const [originalElement, setOriginalElement] = useState<DrawingElement | null>(null);

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
      case 'pencil':
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
      case 'text':
        return {
          x1,
          y1,
          x2: x1,
          y2: y1,
          type,
          roughElement: null,
          text: '',
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

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    return { x, y };
  };

  const isPointInsideElement = (x: number, y: number, el: DrawingElement) => {
    const buffer = 5;
    if (el.type === 'pencil' && el.points) {
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

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);

    if (mode === 'draw') {
      setDrawing(true);
      const element = createElement(x, y, x, y, elementType, strokeColor, strokeWidth);
      updateElements([...elements, element]);
    }

    if (mode === 'move') {
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

  if (drawing && mode === 'draw') {
    const index = elements.length - 1;
    const el = elements[index];

    if (!el) return;

    if (el.type === 'pencil') {
      const newPoints: [number, number][] = [...(el.points || []), [x, y]];
      const roughElement = generator.linearPath(newPoints, {
        stroke: el.strokeColor || '#ffffff',
        strokeWidth: el.strokeWidth || 2,
      });

      const updated: DrawingElement = {
        ...el,
        points: newPoints,
        x2: x,
        y2: y,
        roughElement,
      };

      const elementsCopy = [...elements];
      elementsCopy[index] = updated;
      setElements(elementsCopy);

      ws.current?.send(JSON.stringify({
        type: 'stream',
        element: updated,
        index,
      }));
    } else {
      const updatedElement = createElement(
        el.x1,
        el.y1,
        x,
        y,
        el.type,
        el.strokeColor || '#ffffff',
        el.strokeWidth || 2
      );

      const elementsCopy = [...elements];
      elementsCopy[index] = updatedElement;
      setElements(elementsCopy);

      ws.current?.send(JSON.stringify({
        type: 'stream',
        element: updatedElement,
        index,
      }));
    }
  }

  if (mode === 'move' && movingElementIndex !== null && dragOffset && originalElement) {
    const { dx, dy } = dragOffset;
    const newX1 = x - dx;
    const newY1 = y - dy;
    const deltaX = newX1 - originalElement.x1;
    const deltaY = newY1 - originalElement.y1;
    const newX2 = originalElement.x2 + deltaX;
    const newY2 = originalElement.y2 + deltaY;

    let updated: DrawingElement;
    if (originalElement.type === 'pencil' && originalElement.points) {
      const shiftedPoints = originalElement.points.map(([px, py]) => [px + deltaX, py + deltaY] as [number, number]);
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

    ws.current?.send(JSON.stringify({
      type: 'move',
      element: updated,
      index: movingElementIndex,
    }));
  }
};

  const handleMouseUp = () => {
    setDrawing(false);
    setMovingElementIndex(null);
    setDragOffset(null);
    setOriginalElement(null);

    if (mode === 'draw') {
      const finalizedElement = elements[elements.length - 1];
      if (finalizedElement) {
        ws.current?.send(JSON.stringify({
          type: 'draw',
          element: finalizedElement,
        }));
      }
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);

    if (mode === 'draw' && elementType === 'text') {
      const newElement: DrawingElement = {
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        type: 'text',
        roughElement: null,
        text: '',
        isEditing: true,
        strokeColor,
        strokeWidth,
      };
      updateElements([...elements, newElement]);
      setEditingIndex(elements.length);
      setTextValue('');
    }

    if (mode === 'delete') {
      const hitIndex = elements.findIndex((el) => isPointInsideElement(x, y, el));
      if (hitIndex !== -1) {
        const updated = elements.filter((_, i) => i !== hitIndex);
        updateElements(updated);

               ws.current?.send(JSON.stringify({
          type: 'delete',
          index: hitIndex,
        }));
      }
    }
  };

  useEffect(() => {
    if (!socketRef) return;

    const messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'init' || data.type === 'sync') {
          updateElements(data.shapes);
        }

        if (data.type === 'stream') {
          updateElements((prev) => {
            const copy = [...prev];
            copy[data.index] = data.element;
            return copy;
          });
        }
      } catch (err) {
        // ignore malformed messages
      }
    };

    const openHandler = () => {
      console.log('✅ Connected to WebSocket server');
    };

    const closeHandler = () => {
      console.log('❌ Disconnected from WebSocket server');
    };

    // attach listeners if there's a WebSocket instance
    if (socketRef.current) {
      socketRef.current.addEventListener('message', messageHandler as EventListener);
      socketRef.current.addEventListener('open', openHandler as EventListener);
      socketRef.current.addEventListener('close', closeHandler as EventListener);
    }

    // cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.removeEventListener('message', messageHandler as EventListener);
        socketRef.current.removeEventListener('open', openHandler as EventListener);
        socketRef.current.removeEventListener('close', closeHandler as EventListener);
      }
    };
  }, [socketRef, updateElements]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: 800,
        height: 600,
        margin: '0 auto',
        border: '4px solid white',
        background: 'black',
        boxSizing: 'content-box',
      }}
    >
      <CanvasElement
        elements={elements}
        zoom={zoom}
        canvasRef={drawingCanvasRef}
      />

      <canvas
        ref={overlayCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          cursor:
            mode === 'move'
              ? 'grab'
              : mode === 'delete'
              ? 'pointer'
              : elementType === 'text'
              ? 'text'
              : 'crosshair',
          width: '800px',
          height: '600px',
        }}
        width={800}
        height={600}
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