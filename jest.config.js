module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/bin', "<rootDir>/lib"],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
