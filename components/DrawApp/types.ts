export type ElementType = 'line' | 'rectangle' | 'diamond' | 'ellipse' | 'pencil' | 'text';
export type Mode = 'draw' | 'move' | 'delete';

export interface DrawingElement {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: ElementType;
  roughElement: unknown;
  points?: [number, number][];
  text?: string;
  isEditing?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}
