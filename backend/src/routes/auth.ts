import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../server';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

const generateToken = (userId: number, email: string): string => {
  return jwt.sign(
    { id: userId, email: email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const log = (message: string, data?: any) => {
  console.log(`[AUTH] ${new Date().toISOString()} - ${message}`, data || '');
};

const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
    return;
  }
  next();
};

router.get('/test', (req: Request, res: Response) => {
  res.json({ 
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// POST /api/auth/register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().isLength({ min: 2 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, name } = req.body;
    
    log('Register attempt:', { email, name });

    try {
      const existingUser = await db.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({ 
          error: 'User with this email already exists' 
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await db.query(
        `INSERT INTO users (email, password_hash, name, is_verified, otp_enabled, created_at, updated_at)
         VALUES (LOWER($1), $2, $3, false, false, NOW(), NOW())
         RETURNING id, email, name`,
        [email, passwordHash, name]
      );

      const user = result.rows[0];

      const token = generateToken(user.id, user.email);

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === '23505') {
        res.status(409).json({ 
          error: 'User already exists' 
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'Registration failed',
        details: error.message 
      });
    }
  }
);

// POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    
    log('Login attempt:', { email });

    try {
      const result = await db.query(
        'SELECT id, email, name, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ 
          error: 'Invalid email or password' 
        });
        return;
      }

      const user = result.rows[0];

      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isValid) {
        res.status(401).json({ 
          error: 'Invalid email or password' 
        });
        return;
      }

      const token = generateToken(user.id, user.email);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ 
        error: 'Login failed',
        details: error.message 
      });
    }
  }
);

// GET /api/auth/profile
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const result = await db.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

export default router;