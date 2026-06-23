/**
 * DatFileParser — Adaptador de Infraestructura
 * Parsea el formato .dat estructurado al modelo de dominio Model3D.
 *
 * Formato aceptado:
 * ─────────────────────────────────
 * # Colección: NombreGrupo (Vértices X-Y)   ← comentario de grupo (opcional)
 * 1 x y z                                     ← vértice: index x y z
 * 2 x y z
 * ...
 * Faces:                                      ← separador de caras
 * i j k.                                      ← cara: índices separados por espacio, terminados en '.'
 * i j k l.
 * ...
 * ─────────────────────────────────
 */

import type { IDatParser } from '../../domain/ports/ports';
import type { ParseResult, Model3D, Part3D, Vertex, Face } from '../../domain/entities/model';

export class DatFileParser implements IDatParser {
  parse(content: string, modelName = 'modelo'): ParseResult {
    const errors: string[] = [];
    const lines = content.split('\n');

    const allVertices: Vertex[] = [];
    const allFaces: Face[] = [];
    const groupMap = new Map<string, number[]>(); // group name → [vertexIndices]

    let currentGroup = 'Principal';
    let inFacesSection = false;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();

      if (!line) continue;

      // Detectar sección de caras
      if (/^faces\s*:?\s*$/i.test(line) || line === 'Faces:') {
        inFacesSection = true;
        continue;
      }

      if (inFacesSection) {
        // Parsear cara: "i j k." o "i j k l."
        const cleaned = line.replace(/\.$/, '').trim();
        if (!cleaned) continue;

        const parts = cleaned.split(/\s+/).filter(Boolean);
        if (parts.every(p => /^\d+$/.test(p))) {
          const indices = parts.map(Number);
          if (indices.length >= 3) {
            allFaces.push({ indices });
          }
        } else if (!line.startsWith('#')) {
          errors.push(`Línea ${i + 1}: cara inválida "${line}"`);
        }
        continue;
      }

      // Comentario de grupo: "# Colección: NombreGrupo (Vértices X-Y)"
      if (line.startsWith('#')) {
        const groupMatch = line.match(/coleci[oó]n:\s*(.+?)\s*\(/i)
          ?? line.match(/colecci[oó]n:\s*(.+?)\s*\(/i)
          ?? line.match(/#\s*(.+?)\s*\(V[eé]rtices/i);
        if (groupMatch) {
          currentGroup = groupMatch[1].trim();
        }
        continue;
      }

      // Vértice: "index x y z"
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 4) {
        const [idxStr, xStr, yStr, zStr] = parts;
        const index = parseInt(idxStr, 10);
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);
        const z = parseFloat(zStr);

        if (!isNaN(index) && !isNaN(x) && !isNaN(y) && !isNaN(z)) {
          const vertex: Vertex = { index, x, y, z };
          allVertices.push(vertex);

          if (!groupMap.has(currentGroup)) {
            groupMap.set(currentGroup, []);
          }
          groupMap.get(currentGroup)!.push(index);
        }
      }
    }

    // Construir partes del modelo
    const parts: Part3D[] = [];
    const vertexByIndex = new Map(allVertices.map(v => [v.index, v]));

    for (const [groupName, vertexIndices] of groupMap.entries()) {
      const groupVertices = vertexIndices
        .map(idx => vertexByIndex.get(idx))
        .filter((v): v is Vertex => v !== undefined);

      // Detectar si esta pieza es un aspa (parte animada)
      const isAnimated = /aspa|blade|paleta|rotor|helice|hélix|wing/i.test(groupName);

      // Determinar caras que pertenecen a este grupo
      const groupVertexSet = new Set(vertexIndices);
      const groupFaces = allFaces.filter(f =>
        f.indices.every(idx => groupVertexSet.has(idx))
      );

      parts.push({
        id: `part-${parts.length}`,
        name: groupName,
        vertices: groupVertices,
        faces: groupFaces,
        animationState: {
          isAnimated,
          rotationAxis: 'z',
          angularSpeed: isAnimated ? 1.5 : 0,
          currentAngle: 0,
          pivotOffset: { x: 0, y: 0, z: 0 },
        },
      });
    }

    // Si no se detectaron grupos, poner todo en uno
    if (parts.length === 0 && allVertices.length > 0) {
      parts.push({
        id: 'part-0',
        name: 'Modelo',
        vertices: allVertices,
        faces: allFaces,
        animationState: {
          isAnimated: false,
          rotationAxis: 'z',
          angularSpeed: 0,
          currentAngle: 0,
          pivotOffset: { x: 0, y: 0, z: 0 },
        },
      });
    }

    const model: Model3D = {
      id: `model-${Date.now()}`,
      name: modelName,
      parts,
    };

    return { model, errors };
  }
}
