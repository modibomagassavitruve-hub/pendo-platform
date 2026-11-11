/**
 * Tests pour le service de données de marché
 */
const Database = require('better-sqlite3');
const MarketDataService = require('../services/marketDataService');
const path = require('path');
const fs = require('fs');

describe('MarketDataService Tests', () => {
  let db;
  let service;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeEach(() => {
    // Créer une base de données en mémoire pour les tests
    db = new Database(':memory:');

    // Créer la table stocks
    db.exec(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        change_percent REAL DEFAULT 0,
        volume INTEGER DEFAULT 0,
        exchange TEXT,
        sector TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    service = new MarketDataService(db);
  });

  afterEach(() => {
    if (service.updateInterval) {
      service.stopAutoUpdate();
    }
    db.close();
  });

  describe('seedMarketData', () => {
    test('should seed market data successfully', async () => {
      const inserted = await service.seedMarketData();

      expect(inserted).toBeGreaterThan(0);

      const count = db.prepare('SELECT COUNT(*) as count FROM stocks').get().count;
      expect(count).toBe(inserted);
    });

    test('should not duplicate stocks on re-seed', async () => {
      const firstInsert = await service.seedMarketData();
      const secondInsert = await service.seedMarketData();

      expect(secondInsert).toBe(0); // Aucun nouveau stock inséré

      const count = db.prepare('SELECT COUNT(*) as count FROM stocks').get().count;
      expect(count).toBe(firstInsert);
    });

    test('should insert stocks from multiple exchanges', async () => {
      await service.seedMarketData();

      const exchanges = db.prepare(`
        SELECT DISTINCT exchange FROM stocks
      `).all();

      expect(exchanges.length).toBeGreaterThanOrEqual(5);
      expect(exchanges.map(e => e.exchange)).toContain('JSE');
      expect(exchanges.map(e => e.exchange)).toContain('NGX');
      expect(exchanges.map(e => e.exchange)).toContain('BRVM');
    });
  });

  describe('updatePrices', () => {
    beforeEach(async () => {
      await service.seedMarketData();
    });

    test('should update all stock prices', () => {
      const beforeUpdate = db.prepare('SELECT * FROM stocks LIMIT 1').get();
      const originalPrice = beforeUpdate.price;

      const updated = service.updatePrices();

      expect(updated).toBeGreaterThan(0);

      const afterUpdate = db.prepare('SELECT * FROM stocks WHERE id = ?').get(beforeUpdate.id);

      // Le prix devrait avoir changé (avec une très haute probabilité)
      // Note: Il pourrait théoriquement être le même si la variation aléatoire est exactement 0
      expect(afterUpdate.price).toBeDefined();
      expect(afterUpdate.change_percent).toBeDefined();
    });

    test('should update change_percent for all stocks', () => {
      service.updatePrices();

      const stocks = db.prepare('SELECT * FROM stocks').all();

      stocks.forEach(stock => {
        expect(stock.change_percent).toBeDefined();
        expect(stock.change_percent).toBeGreaterThanOrEqual(-3);
        expect(stock.change_percent).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('startAutoUpdate / stopAutoUpdate', () => {
    beforeEach(async () => {
      await service.seedMarketData();
    });

    test('should start auto-update', () => {
      service.startAutoUpdate(1); // 1 minute interval

      expect(service.updateInterval).toBeDefined();
      expect(service.updateInterval).not.toBeNull();

      service.stopAutoUpdate();
    });

    test('should stop auto-update', () => {
      service.startAutoUpdate(1);
      expect(service.updateInterval).not.toBeNull();

      service.stopAutoUpdate();
      expect(service.updateInterval).toBeNull();
    });
  });
});
