// src/routes/likeRoutes.js - Rutas para operaciones de likes
const express = require('express');
const router = express.Router();

// Importar controladores
const {
  toggleLike,
  createLike,
  getLikesByPost,
  getLikesByComment,
  getAllLikes,
  getLikeById,
  deleteLike,
  getLikesByUser,
  checkUserLike
} = require('../controllers/likeController');

// Importar validadores
const {
  validateCreateLike,
  validateToggleLike,
  validateLikeId,
  validatePostId,
  validateCommentId,
  validateUserId,
  validateCheckLike,
  validateQueryParams
} = require('../validators/likeValidators');

/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Operaciones relacionadas con likes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Like:
 *       type: object
 *       required:
 *         - userId
 *         - targetType
 *         - targetId
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del like
 *         userId:
 *           type: string
 *           description: ID del usuario que dio el like
 *         targetType:
 *           type: string
 *           enum: [Post, Comment]
 *           description: Tipo de contenido que recibió el like
 *         targetId:
 *           type: string
 *           description: ID del post o comentario que recibió el like
 *         isActive:
 *           type: boolean
 *           description: Estado del like
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha cuando se dio el like
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 */

/**
 * @swagger
 * /api/likes/toggle:
 *   post:
 *     summary: Dar o quitar like (toggle)
 *     tags: [Likes]
 *     description: Si no existe el like lo crea, si existe lo activa/desactiva
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetType
 *               - targetId
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [Post, Comment]
 *                 description: Tipo de contenido a likear
 *               targetId:
 *                 type: string
 *                 description: ID del post o comentario
 *             example:
 *               targetType: "Post"
 *               targetId: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Like toggle exitoso
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Contenido no encontrado
 */
router.post('/toggle', validateToggleLike, toggleLike);

/**
 * @swagger
 * /api/likes:
 *   post:
 *     summary: Crear un nuevo like
 *     tags: [Likes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetType
 *               - targetId
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [Post, Comment]
 *               targetId:
 *                 type: string
 *             example:
 *               targetType: "Comment"
 *               targetId: "507f1f77bcf86cd799439012"
 *     responses:
 *       201:
 *         description: Like creado exitosamente
 *       400:
 *         description: Ya has dado like a este contenido
 */
router.post('/', validateCreateLike, createLike);

/**
 * @swagger
 * /api/likes:
 *   get:
 *     summary: Obtener todos los likes
 *     tags: [Likes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [Post, Comment]
 *         description: Filtrar por tipo de contenido
 *     responses:
 *       200:
 *         description: Lista de likes obtenida exitosamente
 */
router.get('/', validateQueryParams, getAllLikes);

/**
 * @swagger
 * /api/likes/post/{postId}:
 *   get:
 *     summary: Obtener likes de un post específico
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Likes del post obtenidos exitosamente
 *       404:
 *         description: Post no encontrado
 */
router.get('/post/:postId', validatePostId, validateQueryParams, getLikesByPost);

/**
 * @swagger
 * /api/likes/comment/{commentId}:
 *   get:
 *     summary: Obtener likes de un comentario específico
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del comentario
 *     responses:
 *       200:
 *         description: Likes del comentario obtenidos exitosamente
 *       404:
 *         description: Comentario no encontrado
 */
router.get('/comment/:commentId', validateCommentId, validateQueryParams, getLikesByComment);

/**
 * @swagger
 * /api/likes/user/{userId}:
 *   get:
 *     summary: Obtener likes de un usuario específico
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [Post, Comment]
 *         description: Filtrar por tipo de contenido
 *     responses:
 *       200:
 *         description: Likes del usuario obtenidos exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/user/:userId', validateUserId, validateQueryParams, getLikesByUser);

/**
 * @swagger
 * /api/likes/check/{targetType}/{targetId}:
 *   get:
 *     summary: Verificar si el usuario actual dio like a un contenido
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: targetType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Post, Comment]
 *         description: Tipo de contenido
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del contenido
 *     responses:
 *       200:
 *         description: Verificación completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasLiked:
 *                       type: boolean
 *                     like:
 *                       $ref: '#/components/schemas/Like'
 */
router.get('/check/:targetType/:targetId', validateCheckLike, checkUserLike);

/**
 * @swagger
 * /api/likes/{id}:
 *   get:
 *     summary: Obtener like por ID
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del like
 *     responses:
 *       200:
 *         description: Like obtenido exitosamente
 *       404:
 *         description: Like no encontrado
 */
router.get('/:id', validateLikeId, getLikeById);

/**
 * @swagger
 * /api/likes/{id}:
 *   delete:
 *     summary: Eliminar like
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del like
 *     responses:
 *       200:
 *         description: Like eliminado exitosamente
 *       403:
 *         description: No tienes permisos para eliminar este like
 *       404:
 *         description: Like no encontrado
 */
router.delete('/:id', validateLikeId, deleteLike);

module.exports = router;