import { Entity } from './Entity';

export interface Level {
  spawn: { x: number; y: number };
  drawBackground: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  entities: Entity[];
}
