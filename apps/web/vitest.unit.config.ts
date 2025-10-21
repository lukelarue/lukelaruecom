import { mergeConfig, defineConfig } from 'vitest/config';
import baseConfig from './vite.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/__tests__/unit/**/*.unit.test.tsx'],
    },
  })
);
