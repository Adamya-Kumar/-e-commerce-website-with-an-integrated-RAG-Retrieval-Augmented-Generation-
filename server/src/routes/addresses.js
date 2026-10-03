import { Router } from 'express';
import {
  getAddresses,
  postAddress,
  putAddress,
  removeAddress,
} from '../controllers/addressController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  addressBodySchema,
  addressParamsSchema,
} from '../validators/address.js';

const addressRouter = Router();

addressRouter.use(requireAuth);
addressRouter.get('/', getAddresses);
addressRouter.post('/', validate({ body: addressBodySchema }), postAddress);
addressRouter.put(
  '/:id',
  validate({ params: addressParamsSchema, body: addressBodySchema }),
  putAddress,
);
addressRouter.delete(
  '/:id',
  validate({ params: addressParamsSchema }),
  removeAddress,
);

export default addressRouter;
