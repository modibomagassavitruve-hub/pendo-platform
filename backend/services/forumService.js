/**
 * Service de gestion du forum
 */

class ForumService {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // CATÉGORIES
  // ============================================

  /**
   * Récupère toutes les catégories actives
   */
  getCategories() {
    try {
      const categories = this.db.prepare(`
        SELECT
          c.*,
          COUNT(DISTINCT t.id) as threads_count,
          COUNT(DISTINCT p.id) as posts_count
        FROM forum_categories c
        LEFT JOIN forum_threads t ON c.id = t.category_id AND t.is_deleted = 0
        LEFT JOIN forum_posts p ON t.id = p.thread_id AND p.is_deleted = 0
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY c.order_index ASC, c.name ASC
      `).all();

      return categories;
    } catch (error) {
      throw new Error(`Erreur récupération catégories: ${error.message}`);
    }
  }

  /**
   * Récupère une catégorie par son ID
   */
  getCategoryById(categoryId) {
    try {
      const category = this.db.prepare(`
        SELECT * FROM forum_categories
        WHERE id = ? AND is_active = 1
      `).get(categoryId);

      return category;
    } catch (error) {
      throw new Error(`Erreur récupération catégorie: ${error.message}`);
    }
  }

  // ============================================
  // FILS DE DISCUSSION (THREADS)
  // ============================================

  /**
   * Récupère les fils de discussion d'une catégorie
   */
  getThreadsByCategory(categoryId, options = {}) {
    const { limit = 20, offset = 0, sort = 'last_activity' } = options;

    try {
      const sortColumn = {
        'last_activity': 't.last_activity_at DESC',
        'created': 't.created_at DESC',
        'replies': 't.replies_count DESC',
        'views': 't.views_count DESC'
      }[sort] || 't.last_activity_at DESC';

      const threads = this.db.prepare(`
        SELECT
          t.*,
          u.first_name || ' ' || u.last_name as author_name,
          u.profile_image as author_image,
          c.name as category_name,
          (SELECT COUNT(*) FROM forum_posts p WHERE p.thread_id = t.id AND p.is_deleted = 0) as posts_count
        FROM forum_threads t
        JOIN users u ON t.user_id = u.id
        JOIN forum_categories c ON t.category_id = c.id
        WHERE t.category_id = ? AND t.is_deleted = 0
        ORDER BY t.is_pinned DESC, ${sortColumn}
        LIMIT ? OFFSET ?
      `).all(categoryId, limit, offset);

      // Compter le total
      const { total } = this.db.prepare(`
        SELECT COUNT(*) as total
        FROM forum_threads
        WHERE category_id = ? AND is_deleted = 0
      `).get(categoryId);

      return { threads, total, limit, offset };
    } catch (error) {
      throw new Error(`Erreur récupération threads: ${error.message}`);
    }
  }

  /**
   * Récupère un fil de discussion par son ID
   */
  getThreadById(threadId, userId = null) {
    try {
      const thread = this.db.prepare(`
        SELECT
          t.*,
          u.first_name || ' ' || u.last_name as author_name,
          u.profile_image as author_image,
          u.email as author_email,
          c.name as category_name,
          c.id as category_id
        FROM forum_threads t
        JOIN users u ON t.user_id = u.id
        JOIN forum_categories c ON t.category_id = c.id
        WHERE t.id = ? AND t.is_deleted = 0
      `).get(threadId);

      if (!thread) {
        return null;
      }

      // Incrémenter le compteur de vues (seulement si pas l'auteur)
      if (userId !== thread.user_id) {
        this.db.prepare(`
          UPDATE forum_threads
          SET views_count = views_count + 1
          WHERE id = ?
        `).run(threadId);
        thread.views_count += 1;
      }

      return thread;
    } catch (error) {
      throw new Error(`Erreur récupération thread: ${error.message}`);
    }
  }

  /**
   * Crée un nouveau fil de discussion
   */
  createThread(userId, categoryId, title, content) {
    try {
      // Vérifier que la catégorie existe
      const category = this.getCategoryById(categoryId);
      if (!category) {
        throw new Error('Catégorie non trouvée');
      }

      const result = this.db.prepare(`
        INSERT INTO forum_threads (category_id, user_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run(categoryId, userId, title, content);

      return this.getThreadById(result.lastInsertRowid);
    } catch (error) {
      throw new Error(`Erreur création thread: ${error.message}`);
    }
  }

  /**
   * Met à jour un fil de discussion
   */
  updateThread(threadId, userId, updates) {
    try {
      const thread = this.getThreadById(threadId);
      if (!thread) {
        throw new Error('Thread non trouvé');
      }

      // Vérifier que l'utilisateur est l'auteur
      if (thread.user_id !== userId) {
        throw new Error('Non autorisé à modifier ce thread');
      }

      const { title, content } = updates;
      this.db.prepare(`
        UPDATE forum_threads
        SET title = COALESCE(?, title),
            content = COALESCE(?, content),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title || null, content || null, threadId);

      return this.getThreadById(threadId);
    } catch (error) {
      throw new Error(`Erreur mise à jour thread: ${error.message}`);
    }
  }

  /**
   * Supprime (soft delete) un fil de discussion
   */
  deleteThread(threadId, userId) {
    try {
      const thread = this.getThreadById(threadId);
      if (!thread) {
        throw new Error('Thread non trouvé');
      }

      // Vérifier que l'utilisateur est l'auteur
      if (thread.user_id !== userId) {
        throw new Error('Non autorisé à supprimer ce thread');
      }

      this.db.prepare(`
        UPDATE forum_threads
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(threadId);

      return { success: true };
    } catch (error) {
      throw new Error(`Erreur suppression thread: ${error.message}`);
    }
  }

  // ============================================
  // POSTS (RÉPONSES)
  // ============================================

  /**
   * Récupère les posts d'un thread
   */
  getPostsByThread(threadId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    try {
      const posts = this.db.prepare(`
        SELECT
          p.*,
          u.first_name || ' ' || u.last_name as author_name,
          u.profile_image as author_image,
          u.email as author_email,
          (SELECT COUNT(*) FROM forum_post_likes WHERE post_id = p.id) as likes_count
        FROM forum_posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.thread_id = ? AND p.is_deleted = 0
        ORDER BY p.created_at ASC
        LIMIT ? OFFSET ?
      `).all(threadId, limit, offset);

      // Compter le total
      const { total } = this.db.prepare(`
        SELECT COUNT(*) as total
        FROM forum_posts
        WHERE thread_id = ? AND is_deleted = 0
      `).get(threadId);

      return { posts, total, limit, offset };
    } catch (error) {
      throw new Error(`Erreur récupération posts: ${error.message}`);
    }
  }

  /**
   * Crée un nouveau post
   */
  createPost(userId, threadId, content) {
    try {
      // Vérifier que le thread existe et n'est pas verrouillé
      const thread = this.getThreadById(threadId);
      if (!thread) {
        throw new Error('Thread non trouvé');
      }
      if (thread.is_locked) {
        throw new Error('Thread verrouillé, impossible de répondre');
      }

      // Créer le post
      const result = this.db.prepare(`
        INSERT INTO forum_posts (thread_id, user_id, content)
        VALUES (?, ?, ?)
      `).run(threadId, userId, content);

      // Mettre à jour le thread (compteur de réponses et dernière activité)
      this.db.prepare(`
        UPDATE forum_threads
        SET replies_count = replies_count + 1,
            last_activity_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(threadId);

      // Récupérer le post créé
      const post = this.db.prepare(`
        SELECT
          p.*,
          u.first_name || ' ' || u.last_name as author_name,
          u.profile_image as author_image
        FROM forum_posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(result.lastInsertRowid);

      return post;
    } catch (error) {
      throw new Error(`Erreur création post: ${error.message}`);
    }
  }

  /**
   * Met à jour un post
   */
  updatePost(postId, userId, content) {
    try {
      const post = this.db.prepare(`
        SELECT * FROM forum_posts WHERE id = ? AND is_deleted = 0
      `).get(postId);

      if (!post) {
        throw new Error('Post non trouvé');
      }

      // Vérifier que l'utilisateur est l'auteur
      if (post.user_id !== userId) {
        throw new Error('Non autorisé à modifier ce post');
      }

      this.db.prepare(`
        UPDATE forum_posts
        SET content = ?,
            is_edited = 1,
            edited_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(content, postId);

      return this.db.prepare(`
        SELECT
          p.*,
          u.first_name || ' ' || u.last_name as author_name,
          u.profile_image as author_image
        FROM forum_posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(postId);
    } catch (error) {
      throw new Error(`Erreur mise à jour post: ${error.message}`);
    }
  }

  /**
   * Supprime (soft delete) un post
   */
  deletePost(postId, userId) {
    try {
      const post = this.db.prepare(`
        SELECT * FROM forum_posts WHERE id = ? AND is_deleted = 0
      `).get(postId);

      if (!post) {
        throw new Error('Post non trouvé');
      }

      // Vérifier que l'utilisateur est l'auteur
      if (post.user_id !== userId) {
        throw new Error('Non autorisé à supprimer ce post');
      }

      this.db.prepare(`
        UPDATE forum_posts
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(postId);

      // Décrémenter le compteur de réponses du thread
      this.db.prepare(`
        UPDATE forum_threads
        SET replies_count = replies_count - 1
        WHERE id = ?
      `).run(post.thread_id);

      return { success: true };
    } catch (error) {
      throw new Error(`Erreur suppression post: ${error.message}`);
    }
  }

  // ============================================
  // LIKES
  // ============================================

  /**
   * Toggle like sur un post
   */
  toggleLike(postId, userId) {
    try {
      // Vérifier si déjà liké
      const existing = this.db.prepare(`
        SELECT id FROM forum_post_likes
        WHERE post_id = ? AND user_id = ?
      `).get(postId, userId);

      if (existing) {
        // Retirer le like
        this.db.prepare(`
          DELETE FROM forum_post_likes
          WHERE post_id = ? AND user_id = ?
        `).run(postId, userId);
        return { liked: false };
      } else {
        // Ajouter le like
        this.db.prepare(`
          INSERT INTO forum_post_likes (post_id, user_id)
          VALUES (?, ?)
        `).run(postId, userId);
        return { liked: true };
      }
    } catch (error) {
      throw new Error(`Erreur toggle like: ${error.message}`);
    }
  }

  /**
   * Récupère les likes d'un utilisateur
   */
  getUserLikes(userId, postIds) {
    try {
      if (!postIds || postIds.length === 0) {
        return [];
      }

      const placeholders = postIds.map(() => '?').join(',');
      const likes = this.db.prepare(`
        SELECT post_id
        FROM forum_post_likes
        WHERE user_id = ? AND post_id IN (${placeholders})
      `).all(userId, ...postIds);

      return likes.map(l => l.post_id);
    } catch (error) {
      throw new Error(`Erreur récupération likes: ${error.message}`);
    }
  }

  // ============================================
  // RECHERCHE
  // ============================================

  /**
   * Recherche dans les threads et posts
   */
  search(query, options = {}) {
    const { limit = 20, offset = 0 } = options;

    try {
      const searchTerm = `%${query}%`;

      const results = this.db.prepare(`
        SELECT DISTINCT
          t.id,
          t.title,
          t.content,
          t.created_at,
          u.first_name || ' ' || u.last_name as author_name,
          c.name as category_name,
          c.id as category_id,
          'thread' as type
        FROM forum_threads t
        JOIN users u ON t.user_id = u.id
        JOIN forum_categories c ON t.category_id = c.id
        WHERE (t.title LIKE ? OR t.content LIKE ?)
          AND t.is_deleted = 0

        UNION ALL

        SELECT DISTINCT
          p.id,
          t.title,
          p.content,
          p.created_at,
          u.first_name || ' ' || u.last_name as author_name,
          c.name as category_name,
          c.id as category_id,
          'post' as type
        FROM forum_posts p
        JOIN forum_threads t ON p.thread_id = t.id
        JOIN users u ON p.user_id = u.id
        JOIN forum_categories c ON t.category_id = c.id
        WHERE p.content LIKE ?
          AND p.is_deleted = 0
          AND t.is_deleted = 0

        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(searchTerm, searchTerm, searchTerm, limit, offset);

      return results;
    } catch (error) {
      throw new Error(`Erreur recherche forum: ${error.message}`);
    }
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  /**
   * Récupère les statistiques du forum
   */
  getStats() {
    try {
      const stats = this.db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM forum_threads WHERE is_deleted = 0) as total_threads,
          (SELECT COUNT(*) FROM forum_posts WHERE is_deleted = 0) as total_posts,
          (SELECT COUNT(DISTINCT user_id) FROM forum_threads WHERE is_deleted = 0) as total_authors,
          (SELECT SUM(views_count) FROM forum_threads WHERE is_deleted = 0) as total_views
      `).get();

      return stats;
    } catch (error) {
      throw new Error(`Erreur récupération stats: ${error.message}`);
    }
  }

  /**
   * Récupère les threads récents
   */
  getRecentThreads(limit = 10) {
    try {
      const threads = this.db.prepare(`
        SELECT
          t.id,
          t.title,
          t.created_at,
          t.replies_count,
          t.views_count,
          u.first_name || ' ' || u.last_name as author_name,
          c.name as category_name
        FROM forum_threads t
        JOIN users u ON t.user_id = u.id
        JOIN forum_categories c ON t.category_id = c.id
        WHERE t.is_deleted = 0
        ORDER BY t.created_at DESC
        LIMIT ?
      `).all(limit);

      return threads;
    } catch (error) {
      throw new Error(`Erreur récupération threads récents: ${error.message}`);
    }
  }
}

module.exports = ForumService;
