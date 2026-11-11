const express = require('express');
const router = express.Router();
const technicalIndicators = require('../services/technicalIndicators');

/**
 * @route   GET /api/indicators/:ticker/rsi
 * @desc    Get RSI (Relative Strength Index) for a stock
 * @params  ticker - Stock ticker symbol (e.g., "AAPL")
 * @query   period - RSI period (default: 14)
 */
router.get('/:ticker/rsi', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = parseInt(req.query.period) || 14;

    const result = await technicalIndicators.calculateRSI(ticker, period);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      ticker,
      indicator: 'RSI',
      period,
      data: result
    });
  } catch (error) {
    console.error('Error calculating RSI:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating RSI',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/indicators/:ticker/macd
 * @desc    Get MACD (Moving Average Convergence Divergence) for a stock
 * @params  ticker - Stock ticker symbol
 * @query   fastPeriod - Fast EMA period (default: 12)
 * @query   slowPeriod - Slow EMA period (default: 26)
 * @query   signalPeriod - Signal line period (default: 9)
 */
router.get('/:ticker/macd', async (req, res) => {
  try {
    const { ticker } = req.params;
    const fastPeriod = parseInt(req.query.fastPeriod) || 12;
    const slowPeriod = parseInt(req.query.slowPeriod) || 26;
    const signalPeriod = parseInt(req.query.signalPeriod) || 9;

    const result = await technicalIndicators.calculateMACD(ticker, fastPeriod, slowPeriod, signalPeriod);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      ticker,
      indicator: 'MACD',
      periods: { fast: fastPeriod, slow: slowPeriod, signal: signalPeriod },
      data: result
    });
  } catch (error) {
    console.error('Error calculating MACD:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating MACD',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/indicators/:ticker/bollinger
 * @desc    Get Bollinger Bands for a stock
 * @params  ticker - Stock ticker symbol
 * @query   period - Moving average period (default: 20)
 * @query   stdDev - Standard deviations (default: 2)
 */
router.get('/:ticker/bollinger', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = parseInt(req.query.period) || 20;
    const stdDev = parseFloat(req.query.stdDev) || 2;

    const result = await technicalIndicators.calculateBollingerBands(ticker, period, stdDev);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      ticker,
      indicator: 'BollingerBands',
      period,
      stdDev,
      data: result
    });
  } catch (error) {
    console.error('Error calculating Bollinger Bands:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating Bollinger Bands',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/indicators/:ticker/moving-averages
 * @desc    Get Moving Averages (SMA & EMA) for a stock
 * @params  ticker - Stock ticker symbol
 * @query   periods - Comma-separated periods (default: 20,50,100,200)
 */
router.get('/:ticker/moving-averages', async (req, res) => {
  try {
    const { ticker } = req.params;
    const periods = req.query.periods
      ? req.query.periods.split(',').map(p => parseInt(p.trim()))
      : [20, 50, 100, 200];

    const result = await technicalIndicators.calculateMovingAverages(ticker, periods);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      ticker,
      indicator: 'MovingAverages',
      periods,
      data: result
    });
  } catch (error) {
    console.error('Error calculating Moving Averages:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating Moving Averages',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/indicators/:ticker/stochastic
 * @desc    Get Stochastic Oscillator for a stock
 * @params  ticker - Stock ticker symbol
 * @query   period - Lookback period (default: 14)
 * @query   signalPeriod - Signal line period (default: 3)
 */
router.get('/:ticker/stochastic', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = parseInt(req.query.period) || 14;
    const signalPeriod = parseInt(req.query.signalPeriod) || 3;

    const result = await technicalIndicators.calculateStochastic(ticker, period, signalPeriod);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      ticker,
      indicator: 'Stochastic',
      period,
      signalPeriod,
      data: result
    });
  } catch (error) {
    console.error('Error calculating Stochastic:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating Stochastic',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/indicators/:ticker/atr
 * @desc    Get ATR (Average True Range) for a stock
 * @params  ticker - Stock ticker symbol
 * @query   period - ATR period (default: 14)
 */
router.get('/:ticker/atr', async (req, res) => {
  try {
    const { ticker } = req.params;
    const period = parseInt(req.query.period) || 14;

    const result = await technicalIndicators.calculateATR(ticker, period);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      ticker,
      indicator: 'ATR',
      period,
      data: result
    });
  } catch (error) {
    console.error('Error calculating ATR:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating ATR',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/indicators/:ticker/obv
 * @desc    Get OBV (On-Balance Volume) for a stock
 * @params  ticker - Stock ticker symbol
 */
router.get('/:ticker/obv', async (req, res) => {
  try {
    const { ticker } = req.params;

    const result = await technicalIndicators.calculateOBV(ticker);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      ticker,
      indicator: 'OBV',
      data: result
    });
  } catch (error) {
    console.error('Error calculating OBV:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating OBV',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/indicators/:ticker/complete
 * @desc    Get complete technical analysis with all indicators and overall recommendation
 * @params  ticker - Stock ticker symbol
 */
router.get('/:ticker/complete', async (req, res) => {
  try {
    const { ticker } = req.params;

    const result = await technicalIndicators.getCompleteAnalysis(ticker);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No data found for ticker: ${ticker}`
      });
    }

    res.json({
      success: true,
      ticker,
      data: result
    });
  } catch (error) {
    console.error('Error calculating complete analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating complete analysis',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/indicators/list
 * @desc    Get list of available indicators and their descriptions
 */
router.get('/list', async (req, res) => {
  res.json({
    success: true,
    indicators: [
      {
        name: 'RSI',
        endpoint: '/api/indicators/:ticker/rsi',
        description: 'Relative Strength Index - Momentum oscillator measuring speed and magnitude of price changes',
        parameters: { period: '14 (default)' },
        interpretation: 'Values above 70 indicate overbought, below 30 indicate oversold'
      },
      {
        name: 'MACD',
        endpoint: '/api/indicators/:ticker/macd',
        description: 'Moving Average Convergence Divergence - Trend-following momentum indicator',
        parameters: { fastPeriod: '12', slowPeriod: '26', signalPeriod: '9' },
        interpretation: 'Bullish when MACD crosses above signal line, bearish when crosses below'
      },
      {
        name: 'BollingerBands',
        endpoint: '/api/indicators/:ticker/bollinger',
        description: 'Bollinger Bands - Volatility bands around moving average',
        parameters: { period: '20', stdDev: '2' },
        interpretation: 'Price near upper band suggests overbought, near lower band suggests oversold'
      },
      {
        name: 'MovingAverages',
        endpoint: '/api/indicators/:ticker/moving-averages',
        description: 'Simple & Exponential Moving Averages - Trend identification',
        parameters: { periods: '20,50,100,200' },
        interpretation: 'Golden cross (short MA crosses above long MA) is bullish, death cross is bearish'
      },
      {
        name: 'Stochastic',
        endpoint: '/api/indicators/:ticker/stochastic',
        description: 'Stochastic Oscillator - Momentum indicator comparing closing price to price range',
        parameters: { period: '14', signalPeriod: '3' },
        interpretation: 'Values above 80 indicate overbought, below 20 indicate oversold'
      },
      {
        name: 'ATR',
        endpoint: '/api/indicators/:ticker/atr',
        description: 'Average True Range - Volatility indicator',
        parameters: { period: '14' },
        interpretation: 'Higher ATR indicates higher volatility, useful for setting stop losses'
      },
      {
        name: 'OBV',
        endpoint: '/api/indicators/:ticker/obv',
        description: 'On-Balance Volume - Volume-based momentum indicator',
        parameters: {},
        interpretation: 'Rising OBV suggests accumulation, falling OBV suggests distribution'
      },
      {
        name: 'CompleteAnalysis',
        endpoint: '/api/indicators/:ticker/complete',
        description: 'Complete technical analysis with all indicators and overall recommendation',
        parameters: {},
        interpretation: 'Returns overall score (0-100) and BUY/SELL/HOLD recommendation'
      }
    ]
  });
});

module.exports = router;
