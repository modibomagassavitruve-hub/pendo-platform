/**
 * Tests pour les middleware de validation
 */
const { validateTransaction, validateAlert, validateAuth, sanitizeInput } = require('../middleware/validation');

describe('Validation Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validateTransaction', () => {
    test('should pass with valid transaction data', () => {
      req.body = {
        ticker: 'AGL',
        type: 'buy',
        quantity: 10,
        price: 45000
      };

      validateTransaction(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail with missing ticker', () => {
      req.body = {
        type: 'buy',
        quantity: 10,
        price: 45000
      };

      validateTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with invalid type', () => {
      req.body = {
        ticker: 'AGL',
        type: 'invalid',
        quantity: 10,
        price: 45000
      };

      validateTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          details: expect.arrayContaining([
            expect.stringContaining('type de transaction')
          ])
        })
      );
    });

    test('should fail with negative quantity', () => {
      req.body = {
        ticker: 'AGL',
        type: 'buy',
        quantity: -5,
        price: 45000
      };

      validateTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should fail with negative price', () => {
      req.body = {
        ticker: 'AGL',
        type: 'buy',
        quantity: 10,
        price: -100
      };

      validateTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateAlert', () => {
    test('should pass with valid alert data', () => {
      req.body = {
        ticker: 'AGL',
        alertType: 'price_above',
        targetValue: 50000
      };

      validateAlert(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail with invalid alert type', () => {
      req.body = {
        ticker: 'AGL',
        alertType: 'invalid',
        targetValue: 50000
      };

      validateAlert(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should fail with negative target value', () => {
      req.body = {
        ticker: 'AGL',
        alertType: 'price_above',
        targetValue: -1000
      };

      validateAlert(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateAuth', () => {
    test('should pass with valid credentials', () => {
      req.body = {
        email: 'test@pendo.com',
        password: 'password123'
      };

      validateAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail with invalid email', () => {
      req.body = {
        email: 'invalid-email',
        password: 'password123'
      };

      validateAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should fail with short password', () => {
      req.body = {
        email: 'test@pendo.com',
        password: '123'
      };

      validateAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.stringContaining('6 caractères')
          ])
        })
      );
    });
  });

  describe('sanitizeInput', () => {
    test('should sanitize string inputs', () => {
      req.body = {
        name: "  Test'Name  ",
        notes: "Some'notes"
      };

      sanitizeInput(req, res, next);

      expect(req.body.name).toBe("Test''Name");
      expect(req.body.notes).toBe("Some''notes");
      expect(next).toHaveBeenCalled();
    });

    test('should not modify non-string values', () => {
      req.body = {
        quantity: 10,
        price: 45000,
        active: true
      };

      sanitizeInput(req, res, next);

      expect(req.body.quantity).toBe(10);
      expect(req.body.price).toBe(45000);
      expect(req.body.active).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });
});
