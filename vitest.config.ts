import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'npm:@supabase/supabase-js@2': '@supabase/supabase-js',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json-summary']
    }
  }
});
