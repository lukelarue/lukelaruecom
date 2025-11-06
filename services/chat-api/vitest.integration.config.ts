import baseConfig from './vitest.config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/__tests__/integration/**/*.integration.test.ts'],
      poolOptions: {
        threads: {
          minThreads: 1,
          maxThreads: 1,
        },
      },
      sequence: {
        concurrent: false,
      },
    },
  })
);
