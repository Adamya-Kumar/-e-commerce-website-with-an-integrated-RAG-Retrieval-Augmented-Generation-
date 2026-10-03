import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.MONGO_DB_NAME = 'spark-commerce-test';

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {},
  maxWorkers: 1,
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};

export default config;
