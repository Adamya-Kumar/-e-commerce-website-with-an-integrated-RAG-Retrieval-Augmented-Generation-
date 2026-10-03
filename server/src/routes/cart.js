import { Router } from 'express';
import {
  deleteCart,
  deleteCartItem,
  getCart,
  patchCartItem,
  postCartItem,
} from '../controllers/cartController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  addCartItemBodySchema,
  cartProductParamsSchema,
  updateCartItemBodySchema,
} from '../validators/cart.js';

const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.get('/', getCart);
cartRouter.post(
  '/items',
  validate({ body: addCartItemBodySchema }),
  postCartItem,
);
cartRouter.patch(
  '/items/:productId',
  validate({ params: cartProductParamsSchema, body: updateCartItemBodySchema }),
  patchCartItem,
);
cartRouter.delete(
  '/items/:productId',
  validate({ params: cartProductParamsSchema }),
  deleteCartItem,
);
cartRouter.delete('/', deleteCart);

export default cartRouter;
