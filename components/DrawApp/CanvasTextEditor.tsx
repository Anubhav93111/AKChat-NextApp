"use client";

import React from 'react';
import { DrawingElement } from './types';

interface Props {
  editingIndex: number | null;
  elements: DrawingElement[];
  textValue: string;
  setTextValue: (s: string) => void;
  setEditingIndex: (i: number | null) => void;
  updateElements: (els: DrawingElement[]) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function CanvasTextEditor({
  editingIndex,
  elements,
  textValue,
  setTextValue,
  setEditingIndex,
  updateElements,
  canvasRef,
}: Props) {
  if (editingIndex === null) return null;

  const canvasRect = canvasRef.current?.getBoundingClientRect();
  if (!canvasRect) return null;

  const el = elements[editingIndex];
  if (!el) return null;

  // position relative to canvas container (assumes container at 0,0)
  return (
    <textarea
      value={textValue}
      onChange={(e) => setTextValue(e.target.value)}
      onBlur={() => {
        const updated = [...elements];
        updated[editingIndex] = {
          ...updated[editingIndex],
          text: textValue,
          isEditing: false,
        };
        updateElements(updated);
        setEditingIndex(null);
      }}
      style={{
        position: 'absolute',
        left: el.x1,
        top: el.y1,
        fontSize: '20px',
        background: 'transparent',
        color: 'white',
        border: 'none',
        outline: 'none',
        resize: 'none',
        zIndex: 10,
      }}
      autoFocus
    />
  );
}
