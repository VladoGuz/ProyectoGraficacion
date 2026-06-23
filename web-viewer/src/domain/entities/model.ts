/**
 * Entidades del Dominio — Capa de Dominio
 * Arquitectura Hexagonal / Clean Architecture
 */

/** Un vértice 3D con coordenadas */
export interface Vertex {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Una cara poligonal definida por índices de vértices (1-based) */
export interface Face {
  readonly indices: readonly number[];
}

/** Estado de animación de una pieza */
export interface AnimationState {
  isAnimated: boolean;
  rotationAxis: 'x' | 'y' | 'z';
  angularSpeed: number; // radianes por segundo
  currentAngle: number; // ángulo actual en radianes
  pivotOffset: { x: number; y: number; z: number };
}

/** Pieza individual del modelo 3D */
export interface Part3D {
  readonly id: string;
  readonly name: string;
  readonly vertices: Vertex[];
  readonly faces: Face[];
  animationState: AnimationState;
}

/** Modelo 3D completo — Raíz del Agregado */
export interface Model3D {
  readonly id: string;
  readonly name: string;
  readonly parts: Part3D[];
}

/** Resultado de parseo de archivo .dat */
export interface ParseResult {
  readonly model: Model3D;
  readonly errors: string[];
}
