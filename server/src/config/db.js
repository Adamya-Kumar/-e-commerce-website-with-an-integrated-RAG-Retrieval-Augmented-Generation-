import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { Cart, Category, Order, Product, User } from '../models/index.js';

const DB_NAME = 'spark-commerce';

export async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  await mongoose.connect(uri, {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 10000,
  });

  await Promise.all([
    User.syncIndexes(),
    Category.syncIndexes(),
    Product.syncIndexes(),
    Cart.syncIndexes(),
    Order.syncIndexes(),
  ]);

  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
}
