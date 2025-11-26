import { createClient } from '@supabase/supabase-js';
import prisma from '../utils/prisma.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function requireAuth(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Get user from our database
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        monthlyCommandLimit: true,
        commandsUsed: true,
      },
    });

    if (!dbUser) {
      // User exists in Supabase but not in our DB - create them
      const newUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email,
          name: user.user_metadata?.name || null,
        },
      });
      req.user = newUser;
    } else {
      req.user = dbUser;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await requireAuth(req, res, next);
    } else {
      next();
    }
  } catch (error) {
    next();
  }
}
