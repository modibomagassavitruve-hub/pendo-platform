const express = require('express');
const router = express.Router();
const PositionSizingService = require('../services/positionSizing');

const positionSizingService = new PositionSizingService();

/**
 * @route   POST /api/position-sizing/fixed-percentage
 * @desc    Calculate position size using fixed percentage risk method
 * @access  Public (can be made private with requireAuth)
 */
router.post('/fixed-percentage', (req, res) => {
  try {
    const { accountBalance, riskPercentage, entryPrice, stopLoss } = req.body;

    if (!accountBalance || !riskPercentage || !entryPrice || !stopLoss) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: accountBalance, riskPercentage, entryPrice, stopLoss'
      });
    }

    const result = positionSizingService.calculateFixedPercentageRisk(
      parseFloat(accountBalance),
      parseFloat(riskPercentage),
      parseFloat(entryPrice),
      parseFloat(stopLoss)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/position-sizing/fixed-dollar
 * @desc    Calculate position size using fixed dollar risk method
 * @access  Public
 */
router.post('/fixed-dollar', (req, res) => {
  try {
    const { riskAmount, entryPrice, stopLoss } = req.body;

    if (!riskAmount || !entryPrice || !stopLoss) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: riskAmount, entryPrice, stopLoss'
      });
    }

    const result = positionSizingService.calculateFixedDollarRisk(
      parseFloat(riskAmount),
      parseFloat(entryPrice),
      parseFloat(stopLoss)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/position-sizing/atr-based
 * @desc    Calculate position size using ATR-based method
 * @access  Public
 */
router.post('/atr-based', (req, res) => {
  try {
    const { accountBalance, riskPercentage, entryPrice, atr, atrMultiplier } = req.body;

    if (!accountBalance || !riskPercentage || !entryPrice || !atr) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: accountBalance, riskPercentage, entryPrice, atr'
      });
    }

    const result = positionSizingService.calculateATRBased(
      parseFloat(accountBalance),
      parseFloat(riskPercentage),
      parseFloat(entryPrice),
      parseFloat(atr),
      atrMultiplier ? parseFloat(atrMultiplier) : 2
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/position-sizing/kelly-criterion
 * @desc    Calculate position size using Kelly Criterion
 * @access  Public
 */
router.post('/kelly-criterion', (req, res) => {
  try {
    const { accountBalance, winRate, avgWin, avgLoss, entryPrice, kellyFraction } = req.body;

    if (!accountBalance || !winRate || !avgWin || !avgLoss || !entryPrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: accountBalance, winRate, avgWin, avgLoss, entryPrice'
      });
    }

    const result = positionSizingService.calculateKellyCriterion(
      parseFloat(accountBalance),
      parseFloat(winRate),
      parseFloat(avgWin),
      parseFloat(avgLoss),
      parseFloat(entryPrice),
      kellyFraction ? parseFloat(kellyFraction) : 0.25
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/position-sizing/risk-reward
 * @desc    Calculate risk-reward ratio
 * @access  Public
 */
router.post('/risk-reward', (req, res) => {
  try {
    const { entryPrice, stopLoss, takeProfit } = req.body;

    if (!entryPrice || !stopLoss || !takeProfit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: entryPrice, stopLoss, takeProfit'
      });
    }

    const result = positionSizingService.calculateRiskReward(
      parseFloat(entryPrice),
      parseFloat(stopLoss),
      parseFloat(takeProfit)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/position-sizing/comprehensive
 * @desc    Get comprehensive position sizing recommendation
 * @access  Public
 */
router.post('/comprehensive', (req, res) => {
  try {
    const params = req.body;

    if (!params.accountBalance || !params.entryPrice || !params.stopLoss) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: accountBalance, entryPrice, stopLoss'
      });
    }

    // Convert string values to numbers
    const processedParams = {
      accountBalance: parseFloat(params.accountBalance),
      riskPercentage: params.riskPercentage ? parseFloat(params.riskPercentage) : 2,
      entryPrice: parseFloat(params.entryPrice),
      stopLoss: parseFloat(params.stopLoss),
      takeProfit: params.takeProfit ? parseFloat(params.takeProfit) : null,
      atr: params.atr ? parseFloat(params.atr) : null,
      winRate: params.winRate ? parseFloat(params.winRate) : null,
      avgWin: params.avgWin ? parseFloat(params.avgWin) : null,
      avgLoss: params.avgLoss ? parseFloat(params.avgLoss) : null
    };

    const result = positionSizingService.getComprehensiveRecommendation(processedParams);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/position-sizing/methods
 * @desc    Get list of available position sizing methods
 * @access  Public
 */
router.get('/methods', (req, res) => {
  res.json({
    success: true,
    methods: [
      {
        name: 'Fixed Percentage Risk',
        endpoint: '/api/position-sizing/fixed-percentage',
        description: 'Risk a fixed percentage of your account on each trade (most popular method)',
        parameters: {
          accountBalance: 'Total account balance',
          riskPercentage: 'Percentage to risk (e.g., 1 for 1%, 2 for 2%)',
          entryPrice: 'Entry price per share',
          stopLoss: 'Stop loss price'
        },
        recommended: true
      },
      {
        name: 'Fixed Dollar Risk',
        endpoint: '/api/position-sizing/fixed-dollar',
        description: 'Risk a fixed dollar amount on each trade',
        parameters: {
          riskAmount: 'Fixed dollar amount to risk',
          entryPrice: 'Entry price per share',
          stopLoss: 'Stop loss price'
        }
      },
      {
        name: 'ATR-Based',
        endpoint: '/api/position-sizing/atr-based',
        description: 'Size position based on volatility (Average True Range)',
        parameters: {
          accountBalance: 'Total account balance',
          riskPercentage: 'Percentage to risk',
          entryPrice: 'Entry price per share',
          atr: 'Average True Range value',
          atrMultiplier: 'ATR multiplier for stop loss (default: 2)'
        }
      },
      {
        name: 'Kelly Criterion',
        endpoint: '/api/position-sizing/kelly-criterion',
        description: 'Optimal bet sizing based on win rate and average win/loss',
        parameters: {
          accountBalance: 'Total account balance',
          winRate: 'Win rate as decimal (e.g., 0.6 for 60%)',
          avgWin: 'Average winning trade size',
          avgLoss: 'Average losing trade size',
          entryPrice: 'Entry price per share',
          kellyFraction: 'Fraction of Kelly to use (default: 0.25)'
        },
        warning: 'Requires trading history - use fractional Kelly (0.25) for safety'
      },
      {
        name: 'Risk-Reward Calculator',
        endpoint: '/api/position-sizing/risk-reward',
        description: 'Calculate risk-reward ratio for a trade',
        parameters: {
          entryPrice: 'Entry price',
          stopLoss: 'Stop loss price',
          takeProfit: 'Take profit price'
        }
      },
      {
        name: 'Comprehensive',
        endpoint: '/api/position-sizing/comprehensive',
        description: 'Get recommendations from multiple methods combined',
        parameters: {
          accountBalance: 'Total account balance (required)',
          entryPrice: 'Entry price (required)',
          stopLoss: 'Stop loss price (required)',
          riskPercentage: 'Risk percentage (optional, default: 2)',
          takeProfit: 'Take profit price (optional)',
          atr: 'Average True Range (optional)',
          winRate: 'Win rate (optional)',
          avgWin: 'Average win (optional)',
          avgLoss: 'Average loss (optional)'
        },
        recommended: true
      }
    ],
    bestPractices: [
      'Never risk more than 1-2% of your account on a single trade',
      'Use stop losses on every trade',
      'Aim for a minimum 2:1 risk-reward ratio',
      'Diversify - limit single positions to max 5-10% of portfolio',
      'Consider using ATR for volatile stocks',
      'Track your trading statistics to use Kelly Criterion effectively'
    ]
  });
});

module.exports = router;
