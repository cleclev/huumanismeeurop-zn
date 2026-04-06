export interface Entity {
  id: string;
  x: number;
  y: number;
  emoji: string;
  size: number;
  isHidden: boolean;
  onInteract: (game: any) => void;
}
