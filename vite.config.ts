import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2023',
    sourcemap: true,
    // Phaser alone is ~1.4 MB minified; it lives in its own long-cached chunk.
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'),
  },
});
