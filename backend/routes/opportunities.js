/**
 * Routes API pour les opportunités d'investissement
 */
const express = require('express');
const { translateArray, translateObject, getLanguageFromRequest } = require('../utils/translationHelper');
const { translateUntranslatedOpportunities, PRIORITY_LANGUAGES } = require('../utils/autoTranslate');
const { scoreOpportunities } = require('../utils/opportunityScoring');

// Nombre max de lignes candidates chargées en mémoire quand on trie par score
// (le score est calculé en JS, pas en SQL, donc on ne peut pas paginer avant
// d'avoir tout scoré et trié pour ce mode de tri précis)
const SCORE_SORT_CANDIDATE_CAP = 500;

module.exports = function(db) {
const router = express.Router();

/**
 * GET /api/opportunities
 * Liste toutes les opportunités avec filtres et pagination
 * Query params:
 *   - sector: filtrer par secteur
 *   - country: filtrer par pays
 *   - risk_level: filtrer par niveau de risque
 *   - min_investment_min: investissement minimum >= valeur
 *   - min_investment_max: investissement minimum <= valeur
 *   - expected_return_min: retour attendu >= valeur
 *   - status: statut (active, closed, pending, funded)
 *   - search: recherche textuelle (titre, description)
 *   - sort: tri (newest, oldest, return_high, return_low, investment_low, investment_high, relevance)
 *     relevance (alias: score) trie par score composite calculé (rendement,
 *     risque, fraîcheur, complétude/vérification, traction) — voir utils/opportunityScoring.js
 *   - limit: nombre de résultats (défaut 20)
 *   - offset: pagination
 */
router.get('/', async (req, res) => {
    try {
        // Extraire la langue de la requête
        const lang = getLanguageFromRequest(req);

        const {
            sector,
            country,
            risk_level,
            min_investment_min,
            min_investment_max,
            expected_return_min,
            status = 'active',
            search,
            sort = 'newest',
            limit = 20,
            offset = 0
        } = req.query;

        let query = `
            SELECT *
            FROM investment_opportunities
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (sector) {
            query += ' AND sector = ?';
            params.push(sector);
        }

        if (country) {
            query += ' AND country = ?';
            params.push(country);
        }

        if (risk_level) {
            query += ' AND risk_level = ?';
            params.push(risk_level);
        }

        if (min_investment_min) {
            query += ' AND min_investment >= ?';
            params.push(parseFloat(min_investment_min));
        }

        if (min_investment_max) {
            query += ' AND min_investment <= ?';
            params.push(parseFloat(min_investment_max));
        }

        if (expected_return_min) {
            query += ' AND expected_return_max >= ?';
            params.push(parseFloat(expected_return_min));
        }

        if (search) {
            query += ' AND (title LIKE ? OR description LIKE ? OR summary LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Tri — le tri par score ('relevance') est calculé en JS (cf. utils/opportunityScoring),
        // il ne peut donc pas être fait via ORDER BY SQL comme les autres critères.
        const sortMap = {
            newest: 'published_at DESC',
            oldest: 'published_at ASC',
            return_high: 'expected_return_max DESC',
            return_low: 'expected_return_max ASC',
            investment_low: 'min_investment ASC',
            investment_high: 'min_investment DESC'
        };
        const sortByScore = sort === 'relevance' || sort === 'score';

        let opportunities;

        if (sortByScore) {
            // On charge un lot de candidats plus large (borné) sans LIMIT/OFFSET
            // SQL, on score tout en JS, on trie par score, puis on pagine.
            const candidateQuery = query + ' ORDER BY published_at DESC LIMIT ?';
            const candidateParams = [...params, SCORE_SORT_CANDIDATE_CAP];
            const candidates = await db.all(candidateQuery, candidateParams);

            for (const opp of candidates) {
                const tags = await db.all('SELECT tag FROM opportunity_tags WHERE opportunity_id = ?', [opp.id]);
                opp.tags = tags.map(t => t.tag);
            }

            const scored = scoreOpportunities(candidates)
                .sort((a, b) => b.relevance_score - a.relevance_score);

            opportunities = scored.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        } else {
            query += ` ORDER BY ${sortMap[sort] || sortMap.newest}`;
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            opportunities = await db.all(query, params);

            // Ajouter les tags pour chaque opportunité
            for (const opp of opportunities) {
                const tags = await db.all('SELECT tag FROM opportunity_tags WHERE opportunity_id = ?', [opp.id]);
                opp.tags = tags.map(t => t.tag);
            }

            // Le score reste calculé et exposé même quand on trie par autre chose,
            // pour permettre d'afficher un badge de pertinence dans l'UI.
            opportunities = scoreOpportunities(opportunities);
        }

        // Compte total pour pagination
        let countQuery = 'SELECT COUNT(*) as total FROM investment_opportunities WHERE 1=1';
        const countParams = [];

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        if (sector) {
            countQuery += ' AND sector = ?';
            countParams.push(sector);
        }
        if (country) {
            countQuery += ' AND country = ?';
            countParams.push(country);
        }
        if (risk_level) {
            countQuery += ' AND risk_level = ?';
            countParams.push(risk_level);
        }
        if (search) {
            countQuery += ' AND (title LIKE ? OR description LIKE ? OR summary LIKE ?)';
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern, searchPattern);
        }

        const result = await db.get(countQuery, countParams);
        const total = result ? result.total : 0;

        // Appliquer les traductions selon la langue demandée
        opportunities = translateArray(opportunities || [], lang);

        res.json({
            success: true,
            data: opportunities,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            }
        });
    } catch (error) {
        console.error('Error fetching opportunities:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/opportunities/translate
 * Déclenche la traduction automatique des opportunités non traduites
 */
router.get('/translate', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await translateUntranslatedOpportunities(db, limit, PRIORITY_LANGUAGES);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error translating opportunities:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/opportunities/stats
 * Statistiques générales sur les opportunités
 */
router.get('/stats', async (req, res) => {
    try {
        const totalResult = await db.get('SELECT COUNT(*) as count FROM investment_opportunities WHERE status = ?', ['active']);
        const bySector = await db.all('SELECT sector, COUNT(*) as count FROM investment_opportunities WHERE status = ? GROUP BY sector ORDER BY count DESC', ['active']);
        const byCountry = await db.all('SELECT country, country_name, COUNT(*) as count FROM investment_opportunities WHERE status = ? GROUP BY country ORDER BY count DESC', ['active']);
        const byRisk = await db.all('SELECT risk_level, COUNT(*) as count FROM investment_opportunities WHERE status = ? GROUP BY risk_level', ['active']);
        const marketSizeResult = await db.get('SELECT SUM(market_size_usd) as total FROM investment_opportunities WHERE status = ? AND market_size_usd IS NOT NULL', ['active']);
        const avgReturnResult = await db.get('SELECT AVG(expected_return_max) as avg FROM investment_opportunities WHERE status = ?', ['active']);

        const stats = {
            total: totalResult?.count || 0,
            by_sector: bySector || [],
            by_country: byCountry || [],
            by_risk: byRisk || [],
            total_market_size: marketSizeResult?.total || 0,
            avg_return: avgReturnResult?.avg || 0
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/opportunities/:slug
 * Détails complets d'une opportunité par slug
 */
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const lang = getLanguageFromRequest(req);

        let opportunity = await db.get('SELECT * FROM investment_opportunities WHERE slug = ?', [slug]);

        if (!opportunity) {
            return res.status(404).json({ success: false, error: 'Opportunity not found' });
        }

        // Récupérer les highlights (table peut ne pas exister)
        try {
            const highlights = await db.all(`
                SELECT highlight_type, title, description, icon, order_index
                FROM opportunity_highlights
                WHERE opportunity_id = ?
                ORDER BY order_index
            `, [opportunity.id]);
            opportunity.highlights = highlights || [];
        } catch (e) {
            opportunity.highlights = [];
        }

        // Récupérer les tags (table peut ne pas exister)
        try {
            const tags = await db.all('SELECT tag FROM opportunity_tags WHERE opportunity_id = ?', [opportunity.id]);
            opportunity.tags = tags ? tags.map(t => t.tag) : [];
        } catch (e) {
            opportunity.tags = [];
        }

        // Récupérer les métriques (table peut ne pas exister)
        try {
            const metrics = await db.all(`
                SELECT metric_name, metric_value, metric_unit, metric_period
                FROM opportunity_metrics
                WHERE opportunity_id = ?
            `, [opportunity.id]);
            opportunity.metrics = metrics || [];
        } catch (e) {
            opportunity.metrics = [];
        }

        // Incrémenter les vues
        try {
            await db.run('UPDATE investment_opportunities SET views = views + 1 WHERE id = ?', [opportunity.id]);
            opportunity.views = (opportunity.views || 0) + 1;
        } catch (e) {
            // Ignore view increment errors
        }

        // Appliquer les traductions selon la langue demandée
        opportunity = translateObject(opportunity, lang);

        res.json({ success: true, data: opportunity });
    } catch (error) {
        console.error('Error fetching opportunity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/opportunities/:id/related
 * Opportunités similaires (même secteur ou pays)
 */
router.get('/:id/related', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 3;
        const lang = getLanguageFromRequest(req);

        // Récupérer l'opportunité source
        const source = await db.get('SELECT sector, country FROM investment_opportunities WHERE id = ?', [id]);

        if (!source) {
            return res.status(404).json({ success: false, error: 'Opportunity not found' });
        }

        // Trouver opportunités similaires (requête simplifiée pour compatibilité PostgreSQL)
        let related = await db.all(`
            SELECT
                id, slug, sector, country, country_name,
                min_investment, max_investment, expected_return_min, expected_return_max,
                risk_level, image_url, logo_url,
                title, summary
            FROM investment_opportunities
            WHERE id != ? AND status = 'active'
            AND (sector = ? OR country = ?)
            ORDER BY published_at DESC
            LIMIT ?
        `, [id, source.sector, source.country, limit]);

        // Traduire les opportunités
        related = translateArray(related || [], lang);

        res.json({ success: true, data: related });
    } catch (error) {
        console.error('Error fetching related opportunities:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/opportunities/:id/save
 * Ajouter une opportunité aux favoris
 */
router.post('/:id/save', async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.body.user_id || 'default';
        const notes = req.body.notes || null;

        // Essayer d'insérer ou mettre à jour
        try {
            await db.run(`
                INSERT INTO user_opportunity_watchlist (user_id, opportunity_id, notes)
                VALUES (?, ?, ?)
            `, [user_id, id, notes]);
        } catch (e) {
            // Si conflit, mettre à jour
            await db.run(`
                UPDATE user_opportunity_watchlist SET notes = ? WHERE user_id = ? AND opportunity_id = ?
            `, [notes, user_id, id]);
        }

        // Incrémenter le compteur de saves
        await db.run('UPDATE investment_opportunities SET saves = saves + 1 WHERE id = ?', [id]);

        res.json({ success: true, message: 'Opportunity saved to watchlist' });
    } catch (error) {
        console.error('Error saving opportunity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/opportunities/:id/save
 * Retirer une opportunité des favoris
 */
router.delete('/:id/save', async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.query.user_id || 'default';

        await db.run('DELETE FROM user_opportunity_watchlist WHERE user_id = ? AND opportunity_id = ?', [user_id, id]);

        // Décrémenter le compteur
        await db.run('UPDATE investment_opportunities SET saves = saves - 1 WHERE id = ? AND saves > 0', [id]);

        res.json({ success: true, message: 'Opportunity removed from watchlist' });
    } catch (error) {
        console.error('Error removing opportunity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/opportunities/user/watchlist
 * Liste des opportunités sauvegardées par l'utilisateur
 */
router.get('/user/watchlist', async (req, res) => {
    try {
        const user_id = req.query.user_id || 'default';
        const lang = getLanguageFromRequest(req);

        let watchlist = await db.all(`
            SELECT
                o.id, o.slug, o.sector, o.country, o.country_name,
                o.min_investment, o.max_investment,
                o.expected_return_min, o.expected_return_max,
                o.risk_level, o.image_url, o.logo_url, o.status,
                o.title, o.summary,
                w.added_at, w.notes
            FROM user_opportunity_watchlist w
            JOIN investment_opportunities o ON w.opportunity_id = o.id
            WHERE w.user_id = ?
            ORDER BY w.added_at DESC
        `, [user_id]);

        // Traduire les opportunités
        watchlist = translateArray(watchlist || [], lang);

        res.json({ success: true, data: watchlist });
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

return router;
};
