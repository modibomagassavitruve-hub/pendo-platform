/**
 * Routes API pour le forum
 */

const ForumService = require('../services/forumService');

function createForumRouter(db, requireAuth) {
  const express = require('express');
  const router = express.Router();
  const forumService = new ForumService(db);

  // ============================================
  // CATÉGORIES
  // ============================================

  /**
   * GET /api/forum/categories
   * Récupère toutes les catégories
   */
  router.get('/categories', (req, res) => {
    try {
      const categories = forumService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/forum/categories/:id
   * Récupère une catégorie spécifique
   */
  router.get('/categories/:id', (req, res) => {
    try {
      const category = forumService.getCategoryById(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ success: false, error: 'Catégorie non trouvée' });
      }
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // THREADS
  // ============================================

  /**
   * GET /api/forum/categories/:id/threads
   * Récupère les threads d'une catégorie
   */
  router.get('/categories/:id/threads', (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { limit, offset, sort } = req.query;

      const result = forumService.getThreadsByCategory(categoryId, {
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
        sort: sort || 'last_activity'
      });

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/forum/threads/:id
   * Récupère un thread spécifique
   */
  router.get('/threads/:id', (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const userId = req.user ? req.user.userId : null;

      const thread = forumService.getThreadById(threadId, userId);
      if (!thread) {
        return res.status(404).json({ success: false, error: 'Thread non trouvé' });
      }

      res.json({ success: true, data: thread });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/forum/threads
   * Crée un nouveau thread
   */
  router.post('/threads', requireAuth, (req, res) => {
    try {
      const { category_id, title, content } = req.body;

      if (!category_id || !title || !content) {
        return res.status(400).json({
          success: false,
          error: 'category_id, title et content requis'
        });
      }

      if (title.length < 5 || title.length > 200) {
        return res.status(400).json({
          success: false,
          error: 'Le titre doit faire entre 5 et 200 caractères'
        });
      }

      if (content.length < 10 || content.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Le contenu doit faire entre 10 et 10000 caractères'
        });
      }

      const thread = forumService.createThread(
        req.user.userId,
        parseInt(category_id),
        title,
        content
      );

      res.status(201).json({ success: true, data: thread });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /api/forum/threads/:id
   * Met à jour un thread
   */
  router.put('/threads/:id', requireAuth, (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const { title, content } = req.body;

      const thread = forumService.updateThread(threadId, req.user.userId, {
        title,
        content
      });

      res.json({ success: true, data: thread });
    } catch (error) {
      if (error.message.includes('Non autorisé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/forum/threads/:id
   * Supprime un thread
   */
  router.delete('/threads/:id', requireAuth, (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const result = forumService.deleteThread(threadId, req.user.userId);
      res.json(result);
    } catch (error) {
      if (error.message.includes('Non autorisé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // POSTS
  // ============================================

  /**
   * GET /api/forum/threads/:id/posts
   * Récupère les posts d'un thread
   */
  router.get('/threads/:id/posts', (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const { limit, offset } = req.query;

      const result = forumService.getPostsByThread(threadId, {
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0
      });

      // Si l'utilisateur est connecté, récupérer ses likes
      if (req.user && result.posts.length > 0) {
        const postIds = result.posts.map(p => p.id);
        const userLikes = forumService.getUserLikes(req.user.userId, postIds);
        result.posts.forEach(post => {
          post.liked_by_user = userLikes.includes(post.id);
        });
      }

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/forum/threads/:id/posts
   * Crée un nouveau post
   */
  router.post('/threads/:id/posts', requireAuth, (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Le contenu est requis'
        });
      }

      if (content.length < 10 || content.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Le contenu doit faire entre 10 et 10000 caractères'
        });
      }

      const post = forumService.createPost(req.user.userId, threadId, content);
      res.status(201).json({ success: true, data: post });
    } catch (error) {
      if (error.message.includes('verrouillé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /api/forum/posts/:id
   * Met à jour un post
   */
  router.put('/posts/:id', requireAuth, (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Le contenu est requis'
        });
      }

      const post = forumService.updatePost(postId, req.user.userId, content);
      res.json({ success: true, data: post });
    } catch (error) {
      if (error.message.includes('Non autorisé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/forum/posts/:id
   * Supprime un post
   */
  router.delete('/posts/:id', requireAuth, (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const result = forumService.deletePost(postId, req.user.userId);
      res.json(result);
    } catch (error) {
      if (error.message.includes('Non autorisé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // LIKES
  // ============================================

  /**
   * POST /api/forum/posts/:id/like
   * Toggle like sur un post
   */
  router.post('/posts/:id/like', requireAuth, (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const result = forumService.toggleLike(postId, req.user.userId);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // RECHERCHE
  // ============================================

  /**
   * GET /api/forum/search
   * Recherche dans le forum
   */
  router.get('/search', (req, res) => {
    try {
      const { q, limit, offset } = req.query;

      if (!q || q.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const results = forumService.search(q, {
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0
      });

      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // STATISTIQUES
  // ============================================

  /**
   * GET /api/forum/stats
   * Récupère les statistiques du forum
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = forumService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/forum/recent
   * Récupère les threads récents
   */
  router.get('/recent', (req, res) => {
    try {
      const { limit } = req.query;
      const threads = forumService.getRecentThreads(limit ? parseInt(limit) : 10);
      res.json({ success: true, data: threads });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = createForumRouter;
