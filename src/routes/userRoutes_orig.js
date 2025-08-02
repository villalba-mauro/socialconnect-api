// src/routes/userRoutes.js - Definición de rutas para operaciones de usuarios
const express = require('express');
const router = express.Router();

// Importar controladores
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  getUserProfile,
  changePassword
} = require('../controllers/userController');

// Importar middleware de autenticación
const { authenticate, authorize } = require('../middleware/auth');

// Importar validadores
const {
  validateCreateUser,
  validateUpdateUser,
  validateLogin,
  validateChangePassword,
  validateUserId
} = require('../validators/userValidators');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Operaciones relacionadas con usuarios
 */

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario (Registro)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: "^[a-zA-Z0-9_]+$"
 *                 example: "john_doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"
 *                 example: "Password123"
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Doe"
 *               profilePicture:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/profile.jpg"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Desarrollador full-stack apasionado por la tecnología"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
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
 *                   example: "Usuario creado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Errores de validación"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *                       value:
 *                         type: string
 */
// Esta ruta maneja POST /api/users para crear nuevos usuarios
// Aplica validaciones antes de ejecutar el controlador
router.post('/', validateCreateUser, createUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener lista de usuarios
 *     tags: [Users]
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
 *         description: Número de usuarios por página
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, username, firstName, lastName]
 *           default: createdAt
 *         description: Campo por el cual ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda (busca en username, firstName, lastName, email)
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
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
 *                   example: "Usuarios obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalUsers:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                         limit:
 *                           type: integer
 */
// Esta ruta maneja GET /api/users para obtener lista de usuarios
router.get('/', getAllUsers);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailOrUsername
 *               - password
 *             properties:
 *               emailOrUsername:
 *                 type: string
 *                 example: "john_doe"
 *                 description: "Email o nombre de usuario"
 *               password:
 *                 type: string
 *                 example: "Password123"
 *                 description: "Contraseña del usuario"
 *     responses:
 *       200:
 *         description: Login exitoso
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
 *                   example: "Login exitoso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Credenciales inválidas"
 */
// Esta ruta maneja POST /api/users/login para autenticación
router.post('/login', validateLogin, loginUser);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
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
 *                   example: "Perfil obtenido exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Token de autorización inválido"
 */
// Esta ruta maneja GET /api/users/profile para obtener perfil del usuario autenticado
// Requiere autenticación mediante token JWT
router.get('/profile', authenticate, getUserProfile);

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Cambiar contraseña del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "OldPassword123"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"
 *                 example: "NewPassword456"
 *               confirmPassword:
 *                 type: string
 *                 example: "NewPassword456"
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       401:
 *         description: No autorizado
 */
// Esta ruta maneja PUT /api/users/change-password para cambiar contraseña
router.put('/change-password', authenticate, validateChangePassword, changePassword);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del usuario
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
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
 *                   example: "Usuario obtenido exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Usuario no encontrado"
 */
// Esta ruta maneja GET /api/users/:id para obtener un usuario específico
router.get('/:id', validateUserId, getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar usuario (solo el propietario)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *               profilePicture:
 *                 type: string
 *                 format: uri
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *             example:
 *               firstName: "John"
 *               lastName: "Smith"
 *               bio: "Desarrollador senior con 10 años de experiencia"
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
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
 *                   example: "Usuario actualizado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tienes permisos para realizar esta acción
 *       404:
 *         description: Usuario no encontrado
 */
// Esta ruta maneja PUT /api/users/:id para actualizar un usuario
// Requiere autenticación y que el usuario sea el propietario
router.put('/:id', authenticate, validateUserId, validateUpdateUser, updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar usuario (solo el propietario)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del usuario
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
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
 *                   example: "Usuario eliminado exitosamente"
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tienes permisos para realizar esta acción
 *       404:
 *         description: Usuario no encontrado
 */
// Esta ruta maneja DELETE /api/users/:id para eliminar (desactivar) un usuario
router.delete('/:id', authenticate, validateUserId, deleteUser);

module.exports = router;