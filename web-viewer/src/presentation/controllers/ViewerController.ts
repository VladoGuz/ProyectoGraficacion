/**
 * ViewerController — Capa de Presentación
 * Orquesta los casos de uso y conecta la UI con la lógica de aplicación.
 */

import { LoadModelUseCase } from '../../application/use_cases/LoadModelUseCase';
import { ParseDatFileUseCase } from '../../application/use_cases/ParseDatFileUseCase';
import type { ThreeJsRenderer } from '../../infrastructure/renderers/ThreeJsRenderer';
import type { Model3D } from '../../domain/entities/model';

export interface ViewerState {
  modelName: string;
  totalVertices: number;
  totalFaces: number;
  totalParts: number;
  animatedParts: number;
}

export class ViewerController {
  private currentModel: Model3D | null = null;

  constructor(
    private readonly loadModelUseCase: LoadModelUseCase,
    private readonly parseDatFileUseCase: ParseDatFileUseCase,
    private readonly renderer: ThreeJsRenderer,
  ) {}

  /** Inicializa con el modelo de ejemplo */
  initDefault(): ViewerState {
    this.currentModel = this.loadModelUseCase.loadDefault();
    return this._buildState();
  }

  /** Carga un archivo .dat desde el FileReader del navegador */
  async loadFile(file: File): Promise<ViewerState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const model = this.parseDatFileUseCase.execute(content, file.name);
          this.currentModel = model;
          this.loadModelUseCase.loadModel(model);
          resolve(this._buildState());
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  }

  setAnimationSpeed(speed: number): void {
    this.renderer.setAnimationSpeed(speed);
  }

  setAnimationPaused(paused: boolean): void {
    this.renderer.setAnimationPaused(paused);
  }

  resetCamera(): void {
    this.renderer.resetCamera();
  }

  private _buildState(): ViewerState {
    if (!this.currentModel) {
      return { modelName: 'Sin modelo', totalVertices: 0, totalFaces: 0, totalParts: 0, animatedParts: 0 };
    }
    const totalVertices = this.currentModel.parts.reduce((s, p) => s + p.vertices.length, 0);
    const totalFaces = this.currentModel.parts.reduce((s, p) => s + p.faces.length, 0);
    const animatedParts = this.currentModel.parts.filter(p => p.animationState.isAnimated).length;

    return {
      modelName: this.currentModel.name,
      totalVertices,
      totalFaces,
      totalParts: this.currentModel.parts.length,
      animatedParts,
    };
  }
}
