import { Router } from 'express';
import { getCategories } from '../controllers/catalogController.js';

const categoryRouter = Router();

categoryRouter.get('/', getCategories);

export default categoryRouter;
