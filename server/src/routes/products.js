import { Router } from 'express';
import { getProduct, listProducts } from '../controllers/catalogController.js';
import { validate } from '../middleware/validate.js';
import {
  productListQuerySchema,
  productSlugParamsSchema,
} from '../validators/catalog.js';

const productRouter = Router();

productRouter.get(
  '/',
  validate({ query: productListQuerySchema }),
  listProducts,
);
productRouter.get(
  '/:slug',
  validate({ params: productSlugParamsSchema }),
  getProduct,
);

export default productRouter;
