const express = require('express');
const router = express.Router();
const { passport, handleOAuthSuccess, handleOAuthFailure } = require('../middleware/oauth');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Autenticación OAuth con Google y GitHub
 */

/**
 * Ruta para iniciar autenticación con Google
 * Redirige al usuario a la página de autorización de Google
 * 
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Iniciar autenticación con Google OAuth
 *     tags: [Authentication]
 *     description: Redirige al usuario a Google para autorización
 *     responses:
 *       302:
 *         description: Redirección a Google OAuth
 */
router.get('/google', 
  // passport.authenticate inicia el flujo OAuth con Google
  // 'scope' define qué información solicitamos a Google
  passport.authenticate('google', { 
    scope: ['profile', 'email']  // Solicitar perfil y email del usuario
  })
);

/**
 * Ruta callback para Google OAuth
 * Google redirige aquí después de que el usuario autoriza la aplicación
 * 
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Callback de Google OAuth
 *     tags: [Authentication]
 *     description: Maneja la respuesta de Google después de la autorización
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Código de autorización de Google
 *     responses:
 *       302:
 *         description: Redirección al frontend con tokens
 *       401:
 *         description: Error de autenticación
 */
router.get('/google/callback',
  // Completar autenticación con Google
  passport.authenticate('google', { 
    failureRedirect: '/auth/failure'  // Redirigir aquí si falla
  }),
  // Si la autenticación es exitosa, manejar el éxito
  handleOAuthSuccess
);

/**
 * Ruta para iniciar autenticación con GitHub
 * Redirige al usuario a la página de autorización de GitHub
 * 
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Iniciar autenticación con GitHub OAuth
 *     tags: [Authentication]
 *     description: Redirige al usuario a GitHub para autorización
 *     responses:
 *       302:
 *         description: Redirección a GitHub OAuth
 */
router.get('/github',
  // passport.authenticate inicia el flujo OAuth con GitHub
  // 'scope' define qué información solicitamos a GitHub
  passport.authenticate('github', { 
    scope: ['user:email']  // Solicitar email del usuario
  })
);

/**
 * Ruta callback para GitHub OAuth
 * GitHub redirige aquí después de que el usuario autoriza la aplicación
 * 
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: Callback de GitHub OAuth
 *     tags: [Authentication]
 *     description: Maneja la respuesta de GitHub después de la autorización
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Código de autorización de GitHub
 *     responses:
 *       302:
 *         description: Redirección al frontend con tokens
 *       401:
 *         description: Error de autenticación
 */
router.get('/github/callback',
  // Completar autenticación con GitHub
  passport.authenticate('github', { 
    failureRedirect: '/auth/failure'
  }),
  // Si la autenticación es exitosa, manejar el éxito
  handleOAuthSuccess
);

/**
 * Ruta para manejar fallos de autenticación
 * Se ejecuta cuando la autenticación OAuth falla
 * 
 * @swagger
 * /api/auth/failure:
 *   get:
 *     summary: Manejo de fallos de autenticación
 *     tags: [Authentication]
 *     description: Redirige al frontend cuando la autenticación falla
 *     responses:
 *       302:
 *         description: Redirección al frontend con error
 */
router.get('/failure', handleOAuthFailure);

/**
 * Ruta para cerrar sesión
 * Limpia la sesión del usuario y tokens
 * 
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión del usuario
 *     tags: [Authentication]
 *     description: Cierra la sesión actual del usuario
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
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
 *                   example: "Sesión cerrada exitosamente"
 */
router.post('/logout', (req, res) => {
  // Destruir la sesión de Passport
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Error al cerrar sesión'
      });
    }
    
    // Limpiar la sesión completamente
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Error al limpiar sesión'
        });
      }
      
      // Respuesta exitosa
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    });
  });
});

/**
 * Ruta para verificar estado de autenticación
 * Útil para el frontend para verificar si el usuario está logueado
 * 
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Verificar estado de autenticación
 *     tags: [Authentication]
 *     description: Verifica si el usuario actual está autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de autenticación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: No autenticado
 */
router.get('/status', (req, res) => {
  // Verificar si hay un usuario en la sesión o token JWT
  const isAuthenticated = req.user || req.isAuthenticated();
  
  if (isAuthenticated) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: 'No autenticado'
    });
  }
});

module.exports = router;