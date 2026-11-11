/**
 * Position Sizing Calculator Service
 * Calculate optimal position sizes based on risk management principles
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database configuration
const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

class PositionSizingService {
  /**
   * Calculate position size using Fixed Percentage Risk Method
   * Most common method: risk a fixed percentage of capital per trade
   *
   * @param {number} accountBalance - Total account balance
   * @param {number} riskPercentage - Risk per trade (e.g., 1 for 1%, 2 for 2%)
   * @param {number} entryPrice - Entry price per share
   * @param {number} stopLoss - Stop loss price
   * @returns {Object} Position size calculation
   */
  calculateFixedPercentageRisk(accountBalance, riskPercentage, entryPrice, stopLoss) {
    // Validate inputs
    if (accountBalance <= 0 || riskPercentage <= 0 || entryPrice <= 0) {
      throw new Error('Invalid input: all values must be positive');
    }

    if (entryPrice <= stopLoss) {
      throw new Error('Entry price must be greater than stop loss for long positions');
    }

    // Calculate risk amount in currency
    const riskAmount = accountBalance * (riskPercentage / 100);

    // Calculate risk per share
    const riskPerShare = entryPrice - stopLoss;

    // Calculate position size (number of shares)
    const positionSize = Math.floor(riskAmount / riskPerShare);

    // Calculate actual investment
    const investment = positionSize * entryPrice;

    // Calculate actual risk percentage of total capital
    const actualRiskAmount = positionSize * riskPerShare;
    const actualRiskPercent = (actualRiskAmount / accountBalance) * 100;

    // Calculate position as percentage of portfolio
    const positionPercent = (investment / accountBalance) * 100;

    return {
      method: 'Fixed Percentage Risk',
      accountBalance,
      riskPercentage,
      riskAmount,
      entryPrice,
      stopLoss,
      riskPerShare,
      positionSize,
      investment,
      actualRiskAmount,
      actualRiskPercent: parseFloat(actualRiskPercent.toFixed(2)),
      positionPercent: parseFloat(positionPercent.toFixed(2)),
      recommendation: this.getRecommendation(positionPercent, actualRiskPercent)
    };
  }

  /**
   * Calculate position size using Fixed Dollar Risk Method
   * Risk a fixed dollar amount per trade
   *
   * @param {number} riskAmount - Fixed dollar amount to risk
   * @param {number} entryPrice - Entry price per share
   * @param {number} stopLoss - Stop loss price
   * @returns {Object} Position size calculation
   */
  calculateFixedDollarRisk(riskAmount, entryPrice, stopLoss) {
    if (riskAmount <= 0 || entryPrice <= 0) {
      throw new Error('Invalid input: all values must be positive');
    }

    if (entryPrice <= stopLoss) {
      throw new Error('Entry price must be greater than stop loss for long positions');
    }

    const riskPerShare = entryPrice - stopLoss;
    const positionSize = Math.floor(riskAmount / riskPerShare);
    const investment = positionSize * entryPrice;
    const actualRiskAmount = positionSize * riskPerShare;

    return {
      method: 'Fixed Dollar Risk',
      riskAmount,
      entryPrice,
      stopLoss,
      riskPerShare,
      positionSize,
      investment,
      actualRiskAmount
    };
  }

  /**
   * Calculate position size using Fixed Ratio Method (Larry Williams)
   * Increase position size by one unit for every $X profit
   *
   * @param {number} accountBalance - Current account balance
   * @param {number} initialBalance - Starting account balance
   * @param {number} delta - Dollar amount needed to increase position by 1 unit
   * @param {number} entryPrice - Entry price per share
   * @returns {Object} Position size calculation
   */
  calculateFixedRatio(accountBalance, initialBalance, delta, entryPrice) {
    const profit = accountBalance - initialBalance;

    // Calculate number of units based on profit
    // Formula: units = (-1 + sqrt(1 + 8 * profit / delta)) / 2
    const units = Math.floor((-1 + Math.sqrt(1 + 8 * profit / delta)) / 2) + 1;

    const positionSize = Math.max(1, units);
    const investment = positionSize * entryPrice;
    const positionPercent = (investment / accountBalance) * 100;

    return {
      method: 'Fixed Ratio',
      accountBalance,
      initialBalance,
      profit,
      delta,
      units: positionSize,
      entryPrice,
      investment,
      positionPercent: parseFloat(positionPercent.toFixed(2))
    };
  }

  /**
   * Calculate position size using Kelly Criterion
   * Optimal bet sizing formula based on win rate and average win/loss
   *
   * @param {number} accountBalance - Total account balance
   * @param {number} winRate - Win rate as decimal (e.g., 0.6 for 60%)
   * @param {number} avgWin - Average winning trade size
   * @param {number} avgLoss - Average losing trade size
   * @param {number} entryPrice - Entry price per share
   * @param {number} kellyFraction - Fraction of Kelly to use (default 0.25 for quarter-Kelly)
   * @returns {Object} Position size calculation
   */
  calculateKellyCriterion(accountBalance, winRate, avgWin, avgLoss, entryPrice, kellyFraction = 0.25) {
    if (winRate <= 0 || winRate >= 1) {
      throw new Error('Win rate must be between 0 and 1');
    }

    // Kelly formula: f* = (bp - q) / b
    // where:
    // f* = fraction of capital to wager
    // b = odds received on the wager (avg win / avg loss)
    // p = probability of winning (win rate)
    // q = probability of losing (1 - win rate)

    const b = Math.abs(avgWin / avgLoss);
    const p = winRate;
    const q = 1 - winRate;

    const kellyPercent = ((b * p - q) / b) * 100;

    // Apply Kelly fraction (usually 0.25 for safety)
    const recommendedPercent = kellyPercent * kellyFraction;

    // Calculate position
    const investment = (accountBalance * recommendedPercent) / 100;
    const positionSize = Math.floor(investment / entryPrice);
    const actualInvestment = positionSize * entryPrice;
    const actualPercent = (actualInvestment / accountBalance) * 100;

    return {
      method: 'Kelly Criterion',
      accountBalance,
      winRate: (winRate * 100).toFixed(1) + '%',
      avgWin,
      avgLoss,
      winLossRatio: b.toFixed(2),
      fullKellyPercent: parseFloat(kellyPercent.toFixed(2)),
      kellyFraction,
      recommendedPercent: parseFloat(recommendedPercent.toFixed(2)),
      entryPrice,
      positionSize,
      investment: actualInvestment,
      actualPercent: parseFloat(actualPercent.toFixed(2)),
      warning: kellyPercent > 20 ? 'Kelly percentage is very high - consider using a smaller fraction' : null
    };
  }

  /**
   * Calculate position size using ATR-based method
   * Size position based on volatility (Average True Range)
   *
   * @param {number} accountBalance - Total account balance
   * @param {number} riskPercentage - Risk per trade (e.g., 1 for 1%)
   * @param {number} entryPrice - Entry price per share
   * @param {number} atr - Average True Range value
   * @param {number} atrMultiplier - ATR multiplier for stop loss (default 2)
   * @returns {Object} Position size calculation
   */
  calculateATRBased(accountBalance, riskPercentage, entryPrice, atr, atrMultiplier = 2) {
    const riskAmount = accountBalance * (riskPercentage / 100);
    const stopDistance = atr * atrMultiplier;
    const positionSize = Math.floor(riskAmount / stopDistance);
    const investment = positionSize * entryPrice;
    const stopLoss = entryPrice - stopDistance;
    const actualRiskAmount = positionSize * stopDistance;
    const positionPercent = (investment / accountBalance) * 100;

    return {
      method: 'ATR-Based',
      accountBalance,
      riskPercentage,
      riskAmount,
      entryPrice,
      atr,
      atrMultiplier,
      stopDistance,
      stopLoss: parseFloat(stopLoss.toFixed(2)),
      positionSize,
      investment,
      actualRiskAmount,
      positionPercent: parseFloat(positionPercent.toFixed(2))
    };
  }

  /**
   * Calculate Risk-Reward Ratio
   *
   * @param {number} entryPrice - Entry price
   * @param {number} stopLoss - Stop loss price
   * @param {number} takeProfit - Take profit price
   * @returns {Object} Risk-reward analysis
   */
  calculateRiskReward(entryPrice, stopLoss, takeProfit) {
    const risk = entryPrice - stopLoss;
    const reward = takeProfit - entryPrice;
    const ratio = reward / risk;

    const riskPercent = (risk / entryPrice) * 100;
    const rewardPercent = (reward / entryPrice) * 100;

    return {
      entryPrice,
      stopLoss,
      takeProfit,
      risk,
      reward,
      ratio: parseFloat(ratio.toFixed(2)),
      riskPercent: parseFloat(riskPercent.toFixed(2)),
      rewardPercent: parseFloat(rewardPercent.toFixed(2)),
      rating: ratio >= 3 ? 'Excellent' : ratio >= 2 ? 'Good' : ratio >= 1.5 ? 'Acceptable' : 'Poor',
      recommendation: ratio >= 2 ? 'Trade is acceptable' : 'Risk-reward ratio is too low, consider adjusting targets'
    };
  }

  /**
   * Calculate maximum position size based on diversification
   *
   * @param {number} accountBalance - Total account balance
   * @param {number} maxPositionPercent - Maximum % per position (e.g., 5 for 5%)
   * @param {number} entryPrice - Entry price per share
   * @returns {Object} Maximum position calculation
   */
  calculateMaxPosition(accountBalance, maxPositionPercent, entryPrice) {
    const maxInvestment = (accountBalance * maxPositionPercent) / 100;
    const maxShares = Math.floor(maxInvestment / entryPrice);
    const actualInvestment = maxShares * entryPrice;
    const actualPercent = (actualInvestment / accountBalance) * 100;

    return {
      accountBalance,
      maxPositionPercent,
      entryPrice,
      maxInvestment,
      maxShares,
      actualInvestment,
      actualPercent: parseFloat(actualPercent.toFixed(2))
    };
  }

  /**
   * Get comprehensive position sizing recommendation
   * Combines multiple methods
   *
   * @param {Object} params - All parameters
   * @returns {Object} Comprehensive recommendation
   */
  getComprehensiveRecommendation(params) {
    const {
      accountBalance,
      riskPercentage = 2,
      entryPrice,
      stopLoss,
      takeProfit = null,
      atr = null,
      winRate = null,
      avgWin = null,
      avgLoss = null
    } = params;

    const results = {
      accountBalance,
      entryPrice,
      stopLoss,
      takeProfit
    };

    // 1. Fixed Percentage Risk (Primary method)
    results.fixedPercentageRisk = this.calculateFixedPercentageRisk(
      accountBalance,
      riskPercentage,
      entryPrice,
      stopLoss
    );

    // 2. Risk-Reward if take profit is provided
    if (takeProfit) {
      results.riskReward = this.calculateRiskReward(entryPrice, stopLoss, takeProfit);
    }

    // 3. ATR-based if ATR is provided
    if (atr) {
      results.atrBased = this.calculateATRBased(accountBalance, riskPercentage, entryPrice, atr);
    }

    // 4. Kelly Criterion if trading stats are provided
    if (winRate && avgWin && avgLoss) {
      try {
        results.kellyCriterion = this.calculateKellyCriterion(
          accountBalance,
          winRate,
          avgWin,
          avgLoss,
          entryPrice
        );
      } catch (error) {
        results.kellyError = error.message;
      }
    }

    // 5. Maximum position (diversification rule - max 5% per position)
    results.maxPosition = this.calculateMaxPosition(accountBalance, 5, entryPrice);

    // Final recommendation
    const recommendedSize = results.fixedPercentageRisk.positionSize;
    const maxSize = results.maxPosition.maxShares;

    results.finalRecommendation = {
      recommendedShares: Math.min(recommendedSize, maxSize),
      reason: recommendedSize > maxSize
        ? 'Limited by diversification rule (max 5% per position)'
        : 'Based on fixed percentage risk method',
      investment: Math.min(recommendedSize, maxSize) * entryPrice,
      stopLoss,
      takeProfit,
      riskAmount: results.fixedPercentageRisk.actualRiskAmount
    };

    return results;
  }

  /**
   * Get recommendation based on position size
   */
  getRecommendation(positionPercent, riskPercent) {
    if (positionPercent > 20) {
      return {
        level: 'warning',
        message: 'Position size is too large (>20% of portfolio). Consider reducing for better diversification.'
      };
    }

    if (riskPercent > 5) {
      return {
        level: 'warning',
        message: 'Risk per trade is high (>5% of account). Consider using a tighter stop loss or smaller position.'
      };
    }

    if (positionPercent > 10) {
      return {
        level: 'caution',
        message: 'Position size is moderate (10-20% of portfolio). Ensure you have other positions for diversification.'
      };
    }

    return {
      level: 'good',
      message: 'Position size is within recommended limits. Good risk management.'
    };
  }
}

module.exports = PositionSizingService;
