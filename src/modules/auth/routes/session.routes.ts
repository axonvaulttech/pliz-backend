// ========== SESSION: Session management routes ==========

import express from 'express';
import { getSessions } from '../controllers/sessions/get_sessions';
import { deleteSession } from '../controllers/sessions/delete_session';
import { deleteAllSessions } from '../controllers/sessions/delete_all_sessions';
import { deleteOtherSessions } from '../controllers/sessions/delete_other_sessions';
import { authenticate } from '../middleware/auth/auth';

const router = express.Router();

/**
 * All session routes require authentication
 */
router.use(authenticate);

/**
 * @route   GET /api/sessions
 * @desc    Get all active sessions (devices)
 * @access  Private
 */
router.get('/', getSessions);

/**
 * @route   DELETE /api/sessions/all
 * @desc    Logout from all sessions (all devices)
 * @access  Private
 * NOTE: This must come before /:sessionId to avoid route conflict
 */
router.delete('/all', deleteAllSessions);

/**
 * @route   DELETE /api/sessions/others
 * @desc    Logout from all other sessions (keep current device)
 * @access  Private
 * NOTE: This must come before /:sessionId to avoid route conflict
 */
router.delete('/others', deleteOtherSessions);

/**
 * @route   DELETE /api/sessions/:sessionId
 * @desc    Logout from specific session (specific device)
 * @access  Private
 */
router.delete('/:sessionId', deleteSession);

export default router;