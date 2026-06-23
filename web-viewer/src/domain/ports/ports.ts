/**
 * Puertos del Dominio — Interfaces que definen los contratos
 * que la capa de infraestructura debe implementar.
 * Arquitectura Hexagonal / Clean Architecture
 */

import type { Model3D, ParseResult } from '../entities/model';

/** Puerto: repositorio de modelos 3D */
export interface IModelRepository {
  /** Obtiene el modelo de ejemplo (molino de viento) */
  getDefaultModel(): Model3D;
}

/** Puerto: parser de archivos .dat */
export interface IDatParser {
  /** Parsea el contenido de un archivo .dat al modelo de dominio */
  parse(content: string, modelName?: string): ParseResult;
}

/** Puerto: motor de renderizado 3D */
export interface IRenderer {
  /** Inicializa el renderer en el contenedor dado */
  initialize(container: HTMLElement): void;
  /** Carga un modelo 3D en la escena */
  loadModel(model: Model3D): void;
  /** Actualiza la animación con delta de tiempo en segundos */
  update(deltaTime: number): void;
  /** Redimensiona el renderer */
  resize(width: number, height: number): void;
  /** Destruye el renderer y libera recursos */
  dispose(): void;
  /** Controla la velocidad de animación de las aspas */
  setAnimationSpeed(speed: number): void;
  /** Pausa/reanuda la animación */
  setAnimationPaused(paused: boolean): void;
  /** Resetea la cámara a la posición inicial */
  resetCamera(): void;
}
