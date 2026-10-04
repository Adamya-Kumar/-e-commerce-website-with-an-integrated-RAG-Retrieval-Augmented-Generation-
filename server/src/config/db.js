import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { Cart, Category, Order, Product, User } from '../models/index.js';

const DB_NAME = process.env.MONGO_DB_NAME || 'spark-commerce';
let connectionPromise;
let indexSyncPromise;

export async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  if (mongoose.connection.readyState !== 1) {
    if (mongoose.connection.readyState !== 2 || !connectionPromise) {
      connectionPromise = mongoose
        .connect(uri, {
          dbName: DB_NAME,
          serverSelectionTimeoutMS: 10000,
        })
        .catch((err) => {
          connectionPromise = undefined;
          throw err;
        });
    }
    await connectionPromise;
  }

  if (!indexSyncPromise) {
    indexSyncPromise = Promise.all([
      User.syncIndexes(),
      Category.syncIndexes(),
      Product.syncIndexes(),
      Cart.syncIndexes(),
      Order.syncIndexes(),
    ])
      .then(() => {
        logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
      })
      .catch((err) => {
        indexSyncPromise = undefined;
        throw err;
      });
  }

  await indexSyncPromise;
}
