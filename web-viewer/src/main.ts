/**
 * main.ts — Composition Root
 * Ensambla todas las dependencias (Dependency Injection manual)
 * e inicia el loop de renderizado.
 *
 * Arquitectura Hexagonal / Clean Architecture
 *  Domain ← Application ← Infrastructure ← Presentation ← Main
 */

import './style.css';

// Infrastructure
import { ThreeJsRenderer } from './infrastructure/renderers/ThreeJsRenderer';
import { WindmillModelRepository } from './infrastructure/repositories/WindmillModelRepository';
import { DatFileParser } from './infrastructure/parsers/DatFileParser';

// Application
import { LoadModelUseCase } from './application/use_cases/LoadModelUseCase';
import { ParseDatFileUseCase } from './application/use_cases/ParseDatFileUseCase';

// Presentation
import { ViewerController } from './presentation/controllers/ViewerController';

// ─── Composition Root ─────────────────────────────────────────────────────────

const renderer = new ThreeJsRenderer();
const repository = new WindmillModelRepository();
const parser = new DatFileParser();

const loadModelUseCase = new LoadModelUseCase(repository, renderer);
const parseDatFileUseCase = new ParseDatFileUseCase(parser);

const controller = new ViewerController(loadModelUseCase, parseDatFileUseCase, renderer);

// ─── Inicializar Renderer ─────────────────────────────────────────────────────

const container = document.getElementById('canvas-container')!;
renderer.initialize(container);

// Cargar modelo de ejemplo
const initialState = controller.initDefault();
updateModelInfo(initialState);

// ─── Loop de Animación ────────────────────────────────────────────────────────

let lastTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);
  const now = performance.now();
  const deltaTime = Math.min((now - lastTime) / 1000, 0.1); // segundos, máximo 100ms
  lastTime = now;

  renderer.update(deltaTime);
  renderer.render();
}
animate();

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  renderer.resize(container.clientWidth, container.clientHeight);
});

// ─── UI: Panel de Control ─────────────────────────────────────────────────────

// Speed slider
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value')!;
speedSlider.addEventListener('input', () => {
  const v = parseFloat(speedSlider.value);
  speedValue.textContent = v.toFixed(1) + 'x';
  controller.setAnimationSpeed(v);
});

// Pause/play
let paused = false;
const pauseBtn = document.getElementById('btn-pause')!;
pauseBtn.addEventListener('click', () => {
  paused = !paused;
  controller.setAnimationPaused(paused);
  pauseBtn.textContent = paused ? '▶ Reanudar' : '⏸ Pausar';
  pauseBtn.classList.toggle('paused', paused);
});

// Reset camera
const resetBtn = document.getElementById('btn-reset-camera')!;
resetBtn.addEventListener('click', () => controller.resetCamera());

// Cargar .dat
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const fileLabel = document.getElementById('file-label')!;
const loadingOverlay = document.getElementById('loading-overlay')!;

fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  fileLabel.textContent = `📂 ${file.name}`;
  loadingOverlay.classList.add('visible');

  try {
    const state = await controller.loadFile(file);
    updateModelInfo(state);
  } catch (err) {
    console.error('Error al cargar el archivo:', err);
    showNotification(`Error al cargar: ${err}`, 'error');
  } finally {
    loadingOverlay.classList.remove('visible');
    fileInput.value = '';
  }
});

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function updateModelInfo(state: ReturnType<typeof controller.initDefault>): void {
  const el = (id: string) => document.getElementById(id);
  const set = (id: string, text: string) => {
    const e = el(id);
    if (e) e.textContent = text;
  };

  set('info-model-name', state.modelName);
  set('info-vertices', state.totalVertices.toLocaleString());
  set('info-faces', state.totalFaces.toLocaleString());
  set('info-parts', state.totalParts.toString());
  set('info-animated', state.animatedParts.toString());
}

function showNotification(message: string, type: 'info' | 'error' = 'info'): void {
  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.classList.add('show'), 10);
  setTimeout(() => {
    notif.classList.remove('show');
    setTimeout(() => notif.remove(), 400);
  }, 3500);
}
