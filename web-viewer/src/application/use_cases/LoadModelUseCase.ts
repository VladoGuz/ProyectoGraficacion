/**
 * LoadModelUseCase — Caso de uso de Aplicación
 * Orquesta la carga del modelo (ejemplo o desde .dat) en el renderer.
 */

import type { IModelRepository, IRenderer } from '../../domain/ports/ports';
import type { Model3D } from '../../domain/entities/model';

export class LoadModelUseCase {
  constructor(
    private readonly repository: IModelRepository,
    private readonly renderer: IRenderer,
  ) {}

  /** Carga el modelo de ejemplo (molino de viento procedural) */
  loadDefault(): Model3D {
    const model = this.repository.getDefaultModel();
    this.renderer.loadModel(model);
    return model;
  }

  /** Carga un modelo ya parseado en el renderer */
  loadModel(model: Model3D): void {
    this.renderer.loadModel(model);
  }
}
