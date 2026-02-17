import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/main.js',
      },
      {
        entry: 'src/main/preload.js',
        onstart({ reload }) {
          reload()
        },
      },
    ]),
    renderer(),
  ],
})
