import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { RecommendationService } from '../services/recommendationService';
import { db } from '../server';
import { logger } from '../utils/logger';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const recommendationService = new RecommendationService();

const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation error', { errors: errors.array(), body: req.body });
    res.status(400).json({ 
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg
      }))
    });
    return; 
  }
  next();
};

const validateRecommendationInput = [
  body('age')
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100')
    .toInt(),
  body('income')
    .isInt({ min: 0 })
    .withMessage('Income must be a positive number')
    .toInt(),
  body('dependents')
    .isInt({ min: 0 })
    .withMessage('Dependents must be a non-negative number')
    .toInt(),
  body('riskTolerance')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Risk tolerance must be low, medium, or high')
    .toLowerCase()
];

// POST /api/recommendation - Get a new recommendation
router.post('/recommendation', 
  authenticateToken, 
  validateRecommendationInput,
  handleValidationErrors,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const { age, income, dependents, riskTolerance } = req.body;
      const userId = req.user?.id;  // Now safely access user.id

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      logger.info('Processing recommendation request', { userId, age, income, dependents, riskTolerance });

      const recommendation = recommendationService.calculateRecommendation({
        age,
        income,
        dependents,
        riskTolerance
      });

      const client = await db.connect();
      try {
        await client.query('BEGIN');

        const insertQuery = `
          INSERT INTO recommendations 
          (user_id, age, income, dependents, risk_tolerance, recommendation_type, 
           coverage_amount, term_years, monthly_premium, explanation, 
           income_multiplier, dependents_factor, risk_adjustment, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          RETURNING id, created_at
        `;

        const values = [
          userId,
          age,
          income,
          dependents,
          riskTolerance,
          recommendation.recommendation.type,
          recommendation.recommendation.coverage,
          recommendation.recommendation.term,
          recommendation.recommendation.monthlyPremium,
          recommendation.explanation,
          recommendation.factors.incomeMultiplier,
          recommendation.factors.dependentsFactor,
          recommendation.factors.riskAdjustment
        ];

        const result = await client.query(insertQuery, values);
        
        await client.query('COMMIT');

        const response = {
          ...recommendation,
          id: result.rows[0].id,
          timestamp: result.rows[0].created_at,
          processingTime: Date.now() - startTime
        };

        logger.info('Recommendation generated successfully', { 
          userId,
          id: result.rows[0].id,
          type: recommendation.recommendation.type,
          coverage: recommendation.recommendation.coverage
        });

        res.json(response);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Error generating recommendation', error);
      next(error);
    }
  }
);

// GET /api/recommendations - Get recommendation history
router.get('/recommendations',
  authenticateToken,  
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative')
      .toInt(),
    query('sortBy')
      .optional()
      .isIn(['created_at', 'coverage_amount', 'age', 'income', 'monthly_premium'])
      .withMessage('Invalid sort column'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc')
      .toLowerCase()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const sortBy = String(req.query.sortBy || 'created_at');
      const order = String(req.query.order || 'desc');

      const validSortColumns = ['created_at', 'coverage_amount', 'age', 'income', 'monthly_premium'];
      const validSortOrders = ['asc', 'desc'];
      
      if (!validSortColumns.includes(sortBy)) {
        res.status(400).json({ error: 'Invalid sort column' });
        return; 
      }
      
      if (!validSortOrders.includes(order.toLowerCase())) {
        res.status(400).json({ error: 'Invalid sort order' });
        return; 
      }

      const countQuery = 'SELECT COUNT(*) FROM recommendations WHERE user_id = $1';
      const countResult = await db.query(countQuery, [userId]);
      const totalCount = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT 
          id,
          age,
          income,
          dependents,
          risk_tolerance,
          recommendation_type,
          coverage_amount,
          term_years,
          monthly_premium,
          explanation,
          income_multiplier,
          dependents_factor,
          risk_adjustment,
          created_at
        FROM recommendations 
        WHERE user_id = $1
        ORDER BY ${sortBy} ${order.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(dataQuery, [userId, limit, offset]);
      
      res.json({
        data: result.rows,
        pagination: {
          total: totalCount,
          limit,
          offset,
          pages: Math.ceil(totalCount / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      });

    } catch (error) {
      logger.error('Error fetching recommendations', error);
      next(error);
    }
  }
);

// GET /api/recommendations/stats - Get statistics (public endpoint - no auth required)
router.get('/recommendations/stats',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_recommendations,
          AVG(age)::NUMERIC(10,1) as average_age,
          AVG(income)::NUMERIC(10,0) as average_income,
          AVG(coverage_amount)::NUMERIC(10,0) as average_coverage,
          AVG(monthly_premium)::NUMERIC(10,2) as average_premium,
          MODE() WITHIN GROUP (ORDER BY recommendation_type) as most_common_type,
          MODE() WITHIN GROUP (ORDER BY risk_tolerance) as most_common_risk_tolerance
        FROM recommendations
      `;

      const typeDistributionQuery = `
        SELECT 
          recommendation_type,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM recommendations
        GROUP BY recommendation_type
        ORDER BY count DESC
      `;

      const riskDistributionQuery = `
        SELECT 
          risk_tolerance,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
        FROM recommendations
        GROUP BY risk_tolerance
        ORDER BY count DESC
      `;

      const [statsResult, typeResult, riskResult] = await Promise.all([
        db.query(statsQuery),
        db.query(typeDistributionQuery),
        db.query(riskDistributionQuery)
      ]);

      res.json({
        summary: statsResult.rows[0],
        typeDistribution: typeResult.rows,
        riskToleranceDistribution: riskResult.rows
      });

    } catch (error) {
      logger.error('Error fetching statistics', error);
      next(error);
    }
  }
);

// GET /api/recommendations/:id - Get specific recommendation
router.get('/recommendations/:id',
  authenticateToken, 
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!id || isNaN(parseInt(id))) {
        res.status(400).json({ error: 'Invalid recommendation ID' });
        return; 
      }

      const query = `
        SELECT * FROM recommendations 
        WHERE id = $1 AND user_id = $2
      `;

      const result = await db.query(query, [id, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Recommendation not found' });
        return; 
      }

      res.json(result.rows[0]);

    } catch (error) {
      logger.error('Error fetching recommendation', error);
      next(error);
    }
  }
);

export default router;