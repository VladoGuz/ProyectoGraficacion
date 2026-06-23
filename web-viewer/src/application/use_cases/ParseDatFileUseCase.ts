/**
 * ParseDatFileUseCase — Caso de uso de Aplicación
 * Parsea el contenido de un archivo .dat subido por el usuario.
 */

import type { IDatParser } from '../../domain/ports/ports';
import type { Model3D } from '../../domain/entities/model';

export class ParseDatFileUseCase {
  constructor(private readonly parser: IDatParser) {}

  execute(fileContent: string, fileName: string): Model3D {
    const modelName = fileName.replace(/\.[^/.]+$/, ''); // quitar extensión
    const result = this.parser.parse(fileContent, modelName);

    if (result.errors.length > 0) {
      console.warn('[ParseDatFileUseCase] Advertencias al parsear:', result.errors);
    }

    return result.model;
  }
}
