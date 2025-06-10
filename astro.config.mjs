import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Basic configuration for the CRT terminal project
  output: 'static',
  publicDir: './static',
  vite: {
    // Allow importing .mjs files
    optimizeDeps: {
      include: []
    }
  }
}); 