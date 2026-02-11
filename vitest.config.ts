/*
 * @Date: 2026-01-31 17:16:00
 * @Author: kenny half-giser@outlook.com
 * @Description: Vitest configuration for vue-renderer
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-01-31 17:16:00
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types/**'],
    },
  },
})
