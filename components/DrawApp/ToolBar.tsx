"use client";

import React from 'react';

type ElementType = 'line' | 'rectangle' | 'diamond' | 'ellipse' | 'pencil' | 'text';
type Mode = 'draw' | 'move' | 'delete';

interface Props {
  elementType: ElementType;
  setElementType: (t: ElementType) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  historyLength: number;
  redoLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  strokeColor: string;
  setStrokeColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
}

export default function Toolbar({
  elementType,
  setElementType,
  mode,
  setMode,
  historyLength,
  redoLength,
  onUndo,
  onRedo,
  onClear,
  zoom,
  setZoom,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap gap-4 items-center">
      {/* Shape selection */}
      <div className="flex gap-4">
        {['line', 'rectangle', 'diamond', 'ellipse', 'pencil', 'text'].map((shape) => (
          <label key={shape} className="flex items-center gap-2 capitalize">
            <input
              type="radio"
              value={shape}
              checked={elementType === (shape as ElementType)}
              onChange={() => setElementType(shape as ElementType)}
              disabled={mode !== 'draw'}
            />
            {shape}
          </label>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {['draw', 'move', 'delete'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m as Mode)}
            className={`px-4 py-1 rounded ${mode === m ? 'bg-blue-600' : 'bg-gray-700'} text-white capitalize`}
          >
            {m} Mode
          </button>
        ))}
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={historyLength === 0}
          className="px-4 py-1 bg-gray-700 text-white rounded"
        >
          Undo
        </button>
        <button
          onClick={onRedo}
          disabled={redoLength === 0}
          className="px-4 py-1 bg-gray-700 text-white rounded"
        >
          Redo
        </button>
      </div>

      {/* Clear */}
      <button
        onClick={onClear}
        className="ml-auto px-4 py-1 bg-yellow-600 text-black rounded hover:bg-yellow-500"
      >
        Clear Canvas
      </button>

      {/* Zoom Controls */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 5))}
          className="px-4 py-1 bg-green-600 text-white rounded"
        >
          Zoom In
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.2))}
          className="px-4 py-1 bg-red-600 text-white rounded"
        >
          Zoom Out
        </button>
        <span className="text-white ml-2">Zoom: {(zoom * 100).toFixed(0)}%</span>
      </div>

      {/* Stroke Color & Thickness */}
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2">
          Color:
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-8 h-8 p-0 border-none"
          />
        </label>

        <label className="flex items-center gap-2">
          Stroke:
          <input
            type="range"
            min={1}
            max={10}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
          <span>{strokeWidth}px</span>
        </label>
      </div>
    </div>
  );
}