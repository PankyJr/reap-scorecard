import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Coverage is measured over the calculation engine only — the pure
      // scoring, rules and import logic. Measuring the whole repo would dilute
      // the number with React pages and server actions that these unit tests
      // are not meant to exercise, and would make the figure meaningless.
      include: [
        'src/lib/scorecard/**/*.ts',
        'src/lib/procurement/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/fixtures/**',
        '**/*.d.ts',
        // Type-only modules compile away to nothing executable.
        '**/types.ts',
        // Launches a real Chromium process and probes the filesystem for a
        // browser binary. Genuinely untestable as a unit; it is exercised by
        // the PDF export path in a running container instead.
        'src/lib/procurement/pdf-render-browser.ts',
      ],

      // Measured floors, not aspirations: CI fails if engine coverage drops
      // below what we have today. Raise them as cover improves; never lower
      // them to make a red build go green.
      //
      // These numbers come from a run WITHOUT tmp/full-scorecard-reference/,
      // which is gitignored because it holds real client data. That is the
      // environment CI actually runs in, and it covers slightly less than a
      // developer machine that happens to have the workbook. Taking the floor
      // from a local run instead produced a gate that passed on one laptop and
      // failed everywhere else.
      //
      // CI baseline: statements 76.50, branches 66.66, functions 82.71,
      //              lines 78.76
      thresholds: {
        statements: 76,
        branches: 66,
        functions: 82,
        lines: 78,
      },
    },
  },
})
