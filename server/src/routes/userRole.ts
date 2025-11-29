import { Router } from 'express';
import { getUserRole } from '../controllers/userRoleController';

const router = Router();

router.get('/', getUserRole);

export default router;