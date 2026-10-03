import { Router } from 'express';
import {
  getOrderById,
  getOrders,
  postCancelOrder,
  postOrder,
  postReturnOrder,
} from '../controllers/orderController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  cancelOrderBodySchema,
  orderParamsSchema,
  placeOrderBodySchema,
  returnOrderBodySchema,
} from '../validators/order.js';

const orderRouter = Router();

orderRouter.use(requireAuth);
orderRouter.post('/', validate({ body: placeOrderBodySchema }), postOrder);
orderRouter.get('/', getOrders);
orderRouter.get('/:id', validate({ params: orderParamsSchema }), getOrderById);
orderRouter.post(
  '/:id/cancel',
  validate({ params: orderParamsSchema, body: cancelOrderBodySchema }),
  postCancelOrder,
);
orderRouter.post(
  '/:id/return',
  validate({ params: orderParamsSchema, body: returnOrderBodySchema }),
  postReturnOrder,
);

export default orderRouter;
