// src/routes/postRoutes.js - Versión limpia para W05 (sin autenticación)
const express = require('express');
const router = express.Router();

// ✅ Importar controladores
const {
  createPost,
  getAllPosts,
  getPostById,
  getPostsByUser,
  getRecentPosts,
  searchPosts
} = require('../controllers/postController');

// ✅ Importar validadores
const {
  validateCreatePost,
  validatePostId,
  validateUserIdParam,
  validateQueryParams
} = require('../validators/postValidators');

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Operaciones relacionadas con posts
 */

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Obtener lista de posts (feed público)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de posts por página
 *     responses:
 *       200:
 *         description: Lista de posts obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Posts obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 */
router.get('/', validateQueryParams, getAllPosts);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Crear un nuevo post
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: "¡Hola mundo! Este es mi primer post en SocialConnect 🚀"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/imagen.jpg"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 example: ["hola-mundo", "primer-post"]
 *     responses:
 *       201:
 *         description: Post creado exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/', validateCreatePost, createPost);

/**
 * @swagger
 * /api/posts/search:
 *   get:
 *     summary: Buscar posts por contenido
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Término de búsqueda
 *         example: "javascript"
 *     responses:
 *       200:
 *         description: Resultados de búsqueda obtenidos
 *       400:
 *         description: Término de búsqueda requerido
 */
router.get('/search', validateQueryParams, searchPosts);

/**
 * @swagger
 * /api/posts/feed/recent:
 *   get:
 *     summary: Obtener posts recientes (feed principal)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Posts por página
 *     responses:
 *       200:
 *         description: Posts recientes obtenidos exitosamente
 */
router.get('/feed/recent', validateQueryParams, getRecentPosts);

/**
 * @swagger
 * /api/posts/user/{userId}:
 *   get:
 *     summary: Obtener posts de un usuario específico
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Posts del usuario obtenidos exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/user/:userId', validateUserIdParam, validateQueryParams, getPostsByUser);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Obtener post por ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del post
 *     responses:
 *       200:
 *         description: Post obtenido exitosamente
 *       404:
 *         description: Post no encontrado
 */
router.get('/:id', validatePostId, getPostById);

module.exports = router;