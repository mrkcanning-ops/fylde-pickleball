/**
 * jest.config.js
 * 
 * Jest configuration for Fylde Pickleball test suite
 * Supports ES modules and React component testing
 */

export default {
  // Use node environment for test execution
  testEnvironment: 'node',

  // File extensions Jest will look for
  moduleFileExtensions: ['js', 'jsx', 'json'],

  // Transform files with Babel (for ES6+ syntax support)
  transform: {
    '^.+\\.jsx?$': ['babel-jest', {
      // Inline Babel configuration to avoid interfering with Next.js build
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-react',
      ],
      plugins: [
        '@babel/plugin-proposal-class-properties',
      ],
    }],
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Module path aliases (if using path aliases in the app)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Ignore coverage for these paths
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/*.d.ts',
    '!node_modules/**',
  ],

  // Verbose output for debugging
  verbose: true,

  // Test timeout (some match generation tests might need more time)
  testTimeout: 10000,

  // Disable coverage by default (can be enabled with --coverage flag)
  collectCoverage: false,
};
