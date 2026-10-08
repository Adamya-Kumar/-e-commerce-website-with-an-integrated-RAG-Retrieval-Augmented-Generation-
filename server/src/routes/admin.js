import { Router } from 'express';
import { proxyChatbot } from './chat.js';
import { buildAdminChatContext } from '../services/adminChatContext.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getCategories,
  getCategoryById,
  getOrderById,
  getOrders,
  getProductById,
  getProducts,
  getStats,
  patchCategory,
  patchOrderStatus,
  patchProduct,
  postCategory,
  postProduct,
  postProductImage,
  removeCategory,
  removeProduct,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import { uploadProductImage } from '../middleware/uploadImage.js';
import { validate } from '../middleware/validate.js';
import {
  adminIdParamsSchema,
  adminOrderListQuerySchema,
  adminOrderStatusBodySchema,
  adminProductListQuerySchema,
  createCategoryBodySchema,
  createProductBodySchema,
  updateCategoryBodySchema,
  updateProductBodySchema,
} from '../validators/admin.js';

const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

/** Lightweight role-check probe used by the auth tests. */
adminRouter.get('/ping', (_req, res) => {
  res.json({ data: { ok: true } });
});

adminRouter.get('/stats', getStats);

adminRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const shopContext = await buildAdminChatContext();
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    await proxyChatbot(
      req,
      res,
      '/chat',
      {
        thread_id: body.thread_id,
        message: body.message,
        page_context: {
          ...(body.page_context && typeof body.page_context === 'object' ? body.page_context : {}),
          page_type: 'admin',
        },
        shop_context: shopContext,
      },
      { userId: `admin:${req.user.id}` },
    );
  }),
);

adminRouter.get(
  '/chat/sessions/latest',
  asyncHandler(async (req, res) => {
    await proxyChatbot(req, res, '/chat/sessions/latest', undefined, {
      userId: `admin:${req.user.id}`,
    });
  }),
);

adminRouter.post('/uploads/image', uploadProductImage, postProductImage);

adminRouter.get(
  '/products',
  validate({ query: adminProductListQuerySchema }),
  getProducts,
);
adminRouter.post(
  '/products',
  validate({ body: createProductBodySchema }),
  postProduct,
);
adminRouter.get(
  '/products/:id',
  validate({ params: adminIdParamsSchema }),
  getProductById,
);
adminRouter.patch(
  '/products/:id',
  validate({ params: adminIdParamsSchema, body: updateProductBodySchema }),
  patchProduct,
);
adminRouter.delete(
  '/products/:id',
  validate({ params: adminIdParamsSchema }),
  removeProduct,
);

adminRouter.get('/categories', getCategories);
adminRouter.post(
  '/categories',
  validate({ body: createCategoryBodySchema }),
  postCategory,
);
adminRouter.get(
  '/categories/:id',
  validate({ params: adminIdParamsSchema }),
  getCategoryById,
);
adminRouter.patch(
  '/categories/:id',
  validate({ params: adminIdParamsSchema, body: updateCategoryBodySchema }),
  patchCategory,
);
adminRouter.delete(
  '/categories/:id',
  validate({ params: adminIdParamsSchema }),
  removeCategory,
);

adminRouter.get(
  '/orders',
  validate({ query: adminOrderListQuerySchema }),
  getOrders,
);
adminRouter.get(
  '/orders/:id',
  validate({ params: adminIdParamsSchema }),
  getOrderById,
);
adminRouter.patch(
  '/orders/:id/status',
  validate({ params: adminIdParamsSchema, body: adminOrderStatusBodySchema }),
  patchOrderStatus,
);

export default adminRouter;
