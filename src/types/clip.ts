export interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface ClipEffect {
  id: string;
  type: string;
  name: string;
  params: Record<string, unknown>;
}

export interface ClipFilter {
  id: string;
  type: string;
  intensity: number;
}
