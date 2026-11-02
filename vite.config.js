<<<<<<< HEAD
import react from '@vitejs/plugin-react'
=======
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
>>>>>>> 0c8d5af4294dd101eabe39f6408dd541a9ea3fc8
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
<<<<<<< HEAD
  plugins: [react()],
=======
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
>>>>>>> 0c8d5af4294dd101eabe39f6408dd541a9ea3fc8
})
