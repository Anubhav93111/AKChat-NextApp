"use client";

import React, { JSX } from "react";
import {
  FaPencilAlt,
  FaRegSquare,
  FaRegCircle,
  FaSlash,
  FaFont,
  FaGem,
  FaUndo,
  FaRedo,
  FaTrash,
  FaSearchPlus,
  FaSearchMinus,
} from "react-icons/fa";

type ElementType = "line" | "rectangle" | "diamond" | "ellipse" | "pencil" | "text";
type Mode = "draw" | "move" | "delete";

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

const shapeIcons: Record<ElementType, JSX.Element> = {
  line: <FaSlash />,
  rectangle: <FaRegSquare />,
  diamond: <FaGem />,
  ellipse: <FaRegCircle />,
  pencil: <FaPencilAlt />,
  text: <FaFont />,
};

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
    <div className="flex flex-wrap items-center gap-4 bg-gray-900 bg-opacity-90 p-3 rounded-xl shadow-lg border border-gray-700">
      {/* Shape Selection */}
      <div className="flex gap-2">
        {Object.keys(shapeIcons).map((shape) => (
          <button
            key={shape}
            onClick={() => setElementType(shape as ElementType)}
            disabled={mode !== "draw"}
            className={`p-2 rounded text-xl ${
              elementType === shape ? "bg-blue-600" : "bg-gray-700"
            } text-white hover:bg-blue-500 transition`}
            title={shape}
          >
            {shapeIcons[shape as ElementType]}
          </button>
        ))}
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        {["draw", "move", "delete"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m as Mode)}
            className={`px-3 py-1 rounded ${
              mode === m ? "bg-blue-600" : "bg-gray-700"
            } text-white capitalize hover:bg-blue-500 transition`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Undo / Redo */}
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={historyLength === 0}
          className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          title="Undo"
        >
          <FaUndo />
        </button>
        <button
          onClick={onRedo}
          disabled={redoLength === 0}
          className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          title="Redo"
        >
          <FaRedo />
        </button>
      </div>

      {/* Clear */}
      <button
        onClick={onClear}
        className="p-2 bg-yellow-600 text-black rounded hover:bg-yellow-500"
        title="Clear Canvas"
      >
        <FaTrash />
      </button>

      {/* Zoom Controls */}
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 5))}
          className="p-2 bg-green-600 text-white rounded hover:bg-green-500"
          title="Zoom In"
        >
          <FaSearchPlus />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.2))}
          className="p-2 bg-red-600 text-white rounded hover:bg-red-500"
          title="Zoom Out"
        >
          <FaSearchMinus />
        </button>
        <span className="text-white text-sm">Zoom: {(zoom * 100).toFixed(0)}%</span>
      </div>

      {/* Stroke Color & Width */}
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2 text-white">
          Color:
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-8 h-8 p-0 border-none"
          />
        </label>

        <label className="flex items-center gap-2 text-white">
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