/**
 * ThreeJsRenderer — Adaptador de Infraestructura
 * Implementa IRenderer usando Three.js con WebGL.
 *
 * Características:
 *  - Iluminación PBR (ambiente + direccional + punto)
 *  - Sombras suaves
 *  - OrbitControls para navegación de cámara
 *  - Animación de aspas via rotación incremental
 *  - Wireframe overlay toggle
 *  - Material metálico para el molino
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { IRenderer } from '../../domain/ports/ports';
import type { Model3D, Part3D, Vertex, Face } from '../../domain/entities/model';

interface AnimatedMesh {
  mesh: THREE.Object3D;
  partId: string;
  isAnimated: boolean;
  rotationAxis: 'x' | 'y' | 'z';
  angularSpeed: number;
  pivot: THREE.Vector3;
}

export class ThreeJsRenderer implements IRenderer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animatedMeshes: AnimatedMesh[] = [];
  private animationSpeed = 1.0;
  private isPaused = false;
  private modelGroup: THREE.Group | null = null;

  initialize(container: HTMLElement): void {
    // Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x161614);
    this.scene.fog = new THREE.FogExp2(0x161614, 0.028);

    // Cámara
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 500);
    this.camera.position.set(10, 6, 16);
    this.camera.lookAt(0, 4, 0);

    // Renderer WebGL
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;
    container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 80;
    this.controls.target.set(0, 5, 0);
    this.controls.update();

    // Iluminación
    this._setupLights();

    // Suelo
    this._setupGround();

    // Grid helper
    const grid = new THREE.GridHelper(40, 40, 0x2c2c28, 0x242420);
    this.scene.add(grid);

    // Stars / partículas de fondo
    this._setupStars();
  }

  private _setupLights(): void {
    // Luz ambiente neutra industrial
    const ambient = new THREE.AmbientLight(0x606060, 0.9);
    this.scene.add(ambient);

    // Luz direccional principal — sol cubierto
    const sun = new THREE.DirectionalLight(0xd8d0c0, 2.2);
    sun.position.set(10, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    // Luz de relleno lateral fría
    const fill = new THREE.DirectionalLight(0x90a0a8, 0.6);
    fill.position.set(-8, 8, -6);
    this.scene.add(fill);

    // Contraluz trasero suave
    const back = new THREE.DirectionalLight(0x707068, 0.4);
    back.position.set(0, 5, -12);
    this.scene.add(back);
  }

  private _setupGround(): void {
    const geo = new THREE.CircleGeometry(25, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x383830,   /* suelo industrial oscuro */
      roughness: 0.99,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private _setupStars(): void {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 80 + 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x888880,
      size: 0.12,
      transparent: true,
      opacity: 0.35,
    });
    this.scene.add(new THREE.Points(starGeo, starMat));
  }

  loadModel(model: Model3D): void {
    // Limpiar modelo anterior
    if (this.modelGroup) {
      this.scene.remove(this.modelGroup);
    }
    this.animatedMeshes = [];
    this.modelGroup = new THREE.Group();
    this.modelGroup.name = model.name;

    // Materiales PBR — paleta industrial gris
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x6a6860,   /* concreto envejecido */
      roughness: 0.92,
      metalness: 0.04,
    });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x5c5850,   /* mampostería oscura */
      roughness: 0.88,
      metalness: 0.02,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x484440,   /* teja oscura */
      roughness: 0.85,
      metalness: 0.03,
    });
    const nacelleMat = new THREE.MeshStandardMaterial({
      color: 0x505860,   /* carcasa metálica gris azulado */
      roughness: 0.5,
      metalness: 0.6,
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x484c54,   /* acero oscuro */
      roughness: 0.4,
      metalness: 0.8,
    });
    const bladeMats = [
      new THREE.MeshStandardMaterial({ color: 0x727878, roughness: 0.6, metalness: 0.25 }),
      new THREE.MeshStandardMaterial({ color: 0x686e6e, roughness: 0.6, metalness: 0.25 }),
      new THREE.MeshStandardMaterial({ color: 0x606666, roughness: 0.6, metalness: 0.25 }),
      new THREE.MeshStandardMaterial({ color: 0x585e5e, roughness: 0.6, metalness: 0.25 }),
    ];

    let bladeCount = 0;

    for (const part of model.parts) {
      const geometry = this._buildGeometry(part);
      if (!geometry) continue;

      // Seleccionar material según el nombre de la pieza
      let material: THREE.Material;
      const nameLow = part.name.toLowerCase();
      if (nameLow.includes('torre') || nameLow.includes('tower')) {
        material = towerMat;
      } else if (nameLow.includes('cuerpo') || nameLow.includes('body')) {
        material = bodyMat;
      } else if (nameLow.includes('techo') || nameLow.includes('roof')) {
        material = roofMat;
      } else if (nameLow.includes('nacela') || nameLow.includes('nacelle')) {
        material = nacelleMat;
      } else if (nameLow.includes('eje') || nameLow.includes('hub')) {
        material = hubMat;
      } else if (nameLow.includes('aspa') || nameLow.includes('blade')) {
        material = bladeMats[bladeCount % bladeMats.length];
        bladeCount++;
      } else {
        material = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.7, metalness: 0.1 });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = part.name;

      // Wireframe overlay
      const wireGeo = new THREE.WireframeGeometry(geometry);
      const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.08, transparent: true });
      const wire = new THREE.LineSegments(wireGeo, wireMat);
      mesh.add(wire);

      this.modelGroup!.add(mesh);

      // Registrar para animación
      this.animatedMeshes.push({
        mesh,
        partId: part.id,
        isAnimated: part.animationState.isAnimated,
        rotationAxis: part.animationState.rotationAxis,
        angularSpeed: part.animationState.angularSpeed,
        pivot: new THREE.Vector3(
          part.animationState.pivotOffset.x,
          part.animationState.pivotOffset.y,
          part.animationState.pivotOffset.z,
        ),
      });
    }

    this.scene.add(this.modelGroup);
  }

  private _buildGeometry(part: Part3D): THREE.BufferGeometry | null {
    if (part.vertices.length === 0 || part.faces.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    const posArray: number[] = [];
    const normArray: number[] = [];

    // Mapa de índice 1-based → posición en array
    const vertexMap = new Map<number, THREE.Vector3>();
    for (const v of part.vertices) {
      vertexMap.set(v.index, new THREE.Vector3(v.x, v.y, v.z));
    }

    for (const face of part.faces) {
      const faceVerts = face.indices.map(idx => vertexMap.get(idx)).filter(Boolean) as THREE.Vector3[];
      if (faceVerts.length < 3) continue;

      // Triangular la cara (fan triangulation)
      for (let i = 1; i < faceVerts.length - 1; i++) {
        const v0 = faceVerts[0];
        const v1 = faceVerts[i];
        const v2 = faceVerts[i + 1];

        // Calcular normal
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        posArray.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
        normArray.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
      }
    }

    if (posArray.length === 0) return null;

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normArray, 3));
    geometry.computeBoundingBox();
    return geometry;
  }

  update(deltaTime: number): void {
    if (this.isPaused) return;

    const dt = deltaTime * this.animationSpeed;

    for (const anim of this.animatedMeshes) {
      if (!anim.isAnimated) continue;

      const angle = anim.angularSpeed * dt;

      // Rotar alrededor del pivote en el eje Z (frente del molino)
      const mesh = anim.mesh as THREE.Mesh;
      const pivot = anim.pivot;

      // Trasladar al pivote, rotar, regresar
      mesh.position.sub(pivot);
      mesh.position.applyEuler(new THREE.Euler(0, 0, angle));
      mesh.position.add(pivot);
      mesh.rotation.z += angle;
    }

    this.controls.update();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setAnimationSpeed(speed: number): void {
    this.animationSpeed = speed;
  }

  setAnimationPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  resetCamera(): void {
    this.camera.position.set(10, 6, 16);
    this.camera.lookAt(0, 4, 0);
    this.controls.target.set(0, 5, 0);
    this.controls.update();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
    this.controls.dispose();
  }
}
