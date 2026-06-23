/**
 * WindmillModelRepository — Molino de Viento Detallado
 *
 * Piezas:
 *  Torre       — cilindro cónico de 16 segmentos
 *  Cuerpo      — prisma octogonal (casa del molino)
 *  Techo       — pirámide octogonal sobre el cuerpo
 *  Nacela      — caja horizontal donde se acoplan las aspas
 *  Eje         — cilindro delgado (8 segmentos)
 *  Aspa 1-4    — pala con perfil alar de 6 puntos (animadas)
 */

import type { IModelRepository } from '../../domain/ports/ports';
import type { Model3D, Part3D, Vertex, Face } from '../../domain/entities/model';

// ── índice global de vértices (1-based) ─────────────────────────────────────
let gIdx = 1;
function v(x: number, y: number, z: number): Vertex {
  return { index: gIdx++, x, y, z };
}

// ── Helpers geométricos ──────────────────────────────────────────────────────

/** Anillo de vértices en el plano XZ a altura y */
function ring(cx: number, cy: number, cz: number, r: number, n: number): Vertex[] {
  const out: Vertex[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(v(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r));
  }
  return out;
}

/** Tapa (fan) desde un centro a un anillo */
function capFan(center: Vertex, ring: Vertex[], invert = false): Face[] {
  const n = ring.length;
  return ring.map((_, i) => {
    const a = ring[i].index;
    const b = ring[(i + 1) % n].index;
    return { indices: invert ? [center.index, b, a] : [center.index, a, b] };
  });
}

/** Banda lateral entre dos anillos */
function sideBand(bot: Vertex[], top: Vertex[], invert = false): Face[] {
  const n = bot.length;
  return bot.map((_, i) => {
    const next = (i + 1) % n;
    const b0 = bot[i].index, b1 = bot[next].index;
    const t0 = top[i].index, t1 = top[next].index;
    return invert
      ? { indices: [b0, t0, t1, b1] }
      : { indices: [b0, b1, t1, t0] };
  });
}

function makePart(
  id: string,
  name: string,
  vertices: Vertex[],
  faces: Face[],
  animated = false,
  speed = 0,
  axis: 'x' | 'y' | 'z' = 'z',
  pivot = { x: 0, y: 0, z: 0 },
): Part3D {
  return {
    id, name, vertices, faces,
    animationState: {
      isAnimated: animated,
      rotationAxis: axis,
      angularSpeed: speed,
      currentAngle: 0,
      pivotOffset: pivot,
    },
  };
}

// ── PIEZAS ───────────────────────────────────────────────────────────────────

/** Torre cónica de 16 segmentos */
function buildTower(): Part3D {
  const SEG = 16;
  const H   = 5.5;
  const R0  = 1.1;   // radio base
  const R1  = 0.45;  // radio tope

  const levels = [
    { y: 0,       r: R0 },
    { y: H * 0.33, r: R0 * 0.82 },
    { y: H * 0.66, r: R0 * 0.64 },
    { y: H,        r: R1 },
  ];

  const rings = levels.map(l => ring(0, l.y, 0, l.r, SEG));
  const verts = rings.flat();
  const faces: Face[] = [];

  // Bandas laterales entre niveles
  for (let i = 0; i < rings.length - 1; i++) {
    faces.push(...sideBand(rings[i], rings[i + 1]));
  }
  // Tapa inferior
  const cBot = v(0, 0, 0);
  verts.push(cBot);
  faces.push(...capFan(cBot, rings[0], true));
  // Tapa superior
  const cTop = v(0, H, 0);
  verts.push(cTop);
  faces.push(...capFan(cTop, rings[rings.length - 1]));

  return makePart('part-tower', 'Torre', verts, faces);
}

/** Cuerpo octogonal — prisma 8 lados */
function buildBody(yBase: number): Part3D {
  const SEG = 8;
  const H   = 1.6;
  const R   = 0.85;

  const bot = ring(0, yBase,     0, R, SEG);
  const top = ring(0, yBase + H, 0, R, SEG);
  const verts = [...bot, ...top];
  const faces: Face[] = [...sideBand(bot, top)];

  const cBot = v(0, yBase, 0);
  const cTop = v(0, yBase + H, 0);
  verts.push(cBot, cTop);
  faces.push(...capFan(cBot, bot, true));
  faces.push(...capFan(cTop, top));

  return makePart('part-body', 'Cuerpo', verts, faces);
}

/** Techo piramidal octogonal */
function buildRoof(yBase: number): Part3D {
  const SEG  = 8;
  const R    = 1.0;   // ligeramente más ancho que el cuerpo (alero)
  const H    = 0.9;

  const base = ring(0, yBase,      0, R, SEG);
  const apex = v(0, yBase + H, 0);
  const verts = [...base, apex];
  const faces = capFan(apex, base, true);
  // tapa inferior del techo (abierta hacia el cuerpo — opcional cerrar)
  const cBase = v(0, yBase, 0);
  verts.push(cBase);
  faces.push(...capFan(cBase, base, true));

  return makePart('part-roof', 'Techo', verts, faces);
}

/** Nacela — caja rectangular horizontal donde van las aspas */
function buildNacelle(cy: number, cz: number): Part3D {
  const W = 0.5, H = 0.45, D = 0.85;
  const hw = W / 2, hh = H / 2, hd = D / 2;

  const v0 = v(-hw, cy - hh, cz - hd);
  const v1 = v( hw, cy - hh, cz - hd);
  const v2 = v( hw, cy - hh, cz + hd);
  const v3 = v(-hw, cy - hh, cz + hd);
  const v4 = v(-hw, cy + hh, cz - hd);
  const v5 = v( hw, cy + hh, cz - hd);
  const v6 = v( hw, cy + hh, cz + hd);
  const v7 = v(-hw, cy + hh, cz + hd);

  const verts = [v0, v1, v2, v3, v4, v5, v6, v7];
  const faces: Face[] = [
    { indices: [v0.index, v1.index, v2.index, v3.index] },
    { indices: [v4.index, v7.index, v6.index, v5.index] },
    { indices: [v0.index, v4.index, v5.index, v1.index] },
    { indices: [v2.index, v6.index, v7.index, v3.index] },
    { indices: [v0.index, v3.index, v7.index, v4.index] },
    { indices: [v1.index, v5.index, v6.index, v2.index] },
  ];

  return makePart('part-nacelle', 'Nacela', verts, faces);
}

/** Eje cilíndrico del rotor */
function buildHub(cy: number, cz: number): Part3D {
  const SEG = 8;
  const R   = 0.13;
  const L   = 0.35;

  const front = ring(0, cy, cz - L / 2, R, SEG);
  const back  = ring(0, cy, cz + L / 2, R, SEG);
  const verts = [...front, ...back];
  const faces = sideBand(front, back);

  const cf = v(0, cy, cz - L / 2);
  const cb = v(0, cy, cz + L / 2);
  verts.push(cf, cb);
  faces.push(...capFan(cf, front, true));
  faces.push(...capFan(cb, back));

  return makePart('part-hub', 'Eje', verts, faces);
}

/**
 * Aspa con perfil alar simplificado (extrusión de 6 puntos):
 * Sección transversal curva — borde de ataque redondeado,
 * borde de salida afilado.
 *
 * La pala se extiende desde el hub hacia afuera.
 */
function buildBlade(idx: number, pivotY: number, pivotZ: number, bladeAngle: number): Part3D {
  const SPAN    = 2.8;   // longitud total del aspa
  const ROOT_W  = 0.48;  // ancho en la raíz
  const TIP_W   = 0.14;  // ancho en la punta
  const THICK   = 0.1;   // grosor máximo

  // Perfil del aspa en 6 puntos (sección transversal normalizada)
  // X = largo del aspa (de 0 a SPAN), Z = perfil alar
  function profile(t: number): number[][] {
    const w   = ROOT_W + (TIP_W - ROOT_W) * t;
    const th  = THICK * (1 - t * 0.6);
    // Puntos del perfil: extrados (top) e intrados (bottom)
    return [
      [-w * 0.5,  th * 0.1],   // borde de ataque — extrados
      [ w * 0.2,  th * 0.85],  // máximo grosor extrados
      [ w * 0.45, th * 0.2],   // borde de salida — extrados
      [ w * 0.45,-th * 0.05],  // borde de salida — intrados
      [ w * 0.1, -th * 0.4],   // intrados medio
      [-w * 0.5,  th * 0.0],   // borde de ataque — intrados (cierre)
    ];
  }

  // Estaciones a lo largo del aspa (t = 0 raíz, t = 1 punta)
  const stations = [0, 0.15, 0.35, 0.6, 0.8, 1.0];
  const cos = Math.cos(bladeAngle);
  const sin = Math.sin(bladeAngle);

  const rings: Vertex[][] = stations.map(t => {
    const spanPos = t * SPAN;      // distancia desde el hub
    const pts = profile(t);
    return pts.map(([px, pz]) => {
      // Rotar perfil según el ángulo del aspa en el plano XY
      const rx = px * cos - spanPos * sin;
      const ry = px * sin + spanPos * cos;
      return v(rx, pivotY + ry, pivotZ + pz);
    });
  });

  const PTS = 6; // puntos por estación
  const verts = rings.flat();
  const faces: Face[] = [];

  // Bandas laterales entre estaciones
  for (let s = 0; s < stations.length - 1; s++) {
    const rA = rings[s];
    const rB = rings[s + 1];
    for (let p = 0; p < PTS; p++) {
      const pNext = (p + 1) % PTS;
      faces.push({
        indices: [
          rA[p].index, rA[pNext].index,
          rB[pNext].index, rB[p].index,
        ],
      });
    }
  }

  // Tapa raíz
  for (let p = 0; p < PTS - 1; p++) {
    faces.push({ indices: [rings[0][0].index, rings[0][p].index, rings[0][p + 1].index] });
  }
  // Tapa punta
  const tipRing = rings[rings.length - 1];
  for (let p = 0; p < PTS - 1; p++) {
    faces.push({ indices: [tipRing[0].index, tipRing[p + 1].index, tipRing[p].index] });
  }

  return makePart(
    `part-blade-${idx}`,
    `Aspa${idx + 1}`,
    verts,
    faces,
    true,    // animada
    1.1,     // velocidad angular
    'z',
    { x: 0, y: pivotY, z: pivotZ },
  );
}

// ── Repository ───────────────────────────────────────────────────────────────

export class WindmillModelRepository implements IModelRepository {
  getDefaultModel(): Model3D {
    gIdx = 1; // reset índice global

    const TOWER_H   = 5.5;
    const BODY_H    = 1.6;
    const ROOF_H    = 0.9;
    const bodyY     = TOWER_H;
    const roofY     = bodyY + BODY_H;
    const nacelleY  = roofY + ROOF_H * 0.25;
    const nacelleZ  = 0.0;
    const hubY      = nacelleY;
    const hubZ      = -0.5;
    const bladeZ    = hubZ - 0.18;

    const tower    = buildTower();
    const body     = buildBody(bodyY);
    const roof     = buildRoof(roofY);
    const nacelle  = buildNacelle(nacelleY, nacelleZ);
    const hub      = buildHub(hubY, hubZ);

    // 4 aspas separadas 90°
    const blades = [0, 1, 2, 3].map(i =>
      buildBlade(i, hubY, bladeZ, (i * Math.PI) / 2)
    );

    return {
      id: 'windmill-v2',
      name: 'Molino de Viento',
      parts: [tower, body, roof, nacelle, hub, ...blades],
    };
  }
}
