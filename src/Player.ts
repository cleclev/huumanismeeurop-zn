export class Player {
  x: number;
  y: number;
  speed: number = 5;
  emoji: string = '🧑🎨';
  size: number = 30;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  move(dx: number, dy: number, canvasWidth: number, canvasHeight: number) {
    this.x += dx * this.speed;
    this.y += dy * this.speed;

    // Collisions
    this.x = Math.max(0, Math.min(this.x, canvasWidth - this.size));
    this.y = Math.max(0, Math.min(this.y, canvasHeight - this.size));
  }
}
