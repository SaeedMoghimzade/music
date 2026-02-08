
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // تنظیم مسیر به صورت نسبی برای سازگاری با GitHub Pages و زیرپوشه‌ها
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // اطمینان از تولید صحیح sourcemap در صورت نیاز
    sourcemap: false,
  },
});
