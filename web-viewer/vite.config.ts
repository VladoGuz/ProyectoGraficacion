import { defineConfig } from 'vite';

export default defineConfig({
  // Para GitHub Pages: cambia 'ProyectoFinalGraficacion' al nombre de tu repo
  base: '/ProyectoGraficacion/web-viewer/',
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
