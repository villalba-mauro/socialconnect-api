// src/routes/authRoutes.js - Rutas OAuth sin debug
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
 * @swagger
 * /api/auth:
 *   get:
 *     summary: Información sobre endpoints de autenticación disponibles
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Lista de endpoints OAuth disponibles
 */
router.get('/', (req, res) => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const githubConfigured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  
  res.json({
    success: true,
    message: 'SocialConnect API - Endpoints de Autenticación',
    version: '1.0.0',
    oauth: {
      google: {
        configured: googleConfigured,
        endpoint: googleConfigured ? `${baseUrl}/api/auth/google` : 'No configurado',
        status: googleConfigured ? 'Disponible ✅' : 'No disponible ❌'
      },
      github: {
        configured: githubConfigured,
        endpoint: githubConfigured ? `${baseUrl}/api/auth/github` : 'No configurado',
        status: githubConfigured ? 'Disponible ✅' : 'No disponible ❌'
      }
    },
    endpoints: {
      googleOAuth: `${baseUrl}/api/auth/google`,
      githubOAuth: `${baseUrl}/api/auth/github`,
      status: `${baseUrl}/api/auth/status`,
      test: `${baseUrl}/api/auth/test`,
      logout: `${baseUrl}/api/auth/logout`
    },
    usage: {
      google: 'Visita /api/auth/google para iniciar sesión con Google',
      github: 'Visita /api/auth/github para iniciar sesión con GitHub',
      status: 'Visita /api/auth/status para verificar tu estado de autenticación'
    }
  });
});

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Iniciar autenticación con Google OAuth
 *     tags: [Authentication]
 *     description: Redirige al usuario a Google para autorización
 *     responses:
 *       302:
 *         description: Redirección a Google OAuth
 *       503:
 *         description: OAuth no configurado
 */
router.get('/google', (req, res, next) => {
  // Verificar si Google OAuth está configurado
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      error: 'Google OAuth no está configurado',
      message: 'Las credenciales de Google no están disponibles',
      required: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
    });
  }
  
  // Verificar si passport está disponible
  if (!passport) {
    return res.status(500).json({
      success: false,
      error: 'Passport no está disponible',
      message: 'Error interno del servidor OAuth'
    });
  }
  
  try {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error iniciando OAuth con Google',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Callback de Google OAuth
 *     tags: [Authentication]
 *     description: Maneja la respuesta de Google después de la autorización
 */
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/api/auth/failure'
  }),
  handleOAuthSuccess
);

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Iniciar autenticación con GitHub OAuth
 *     tags: [Authentication]
 *     description: Redirige al usuario a GitHub para autorización
 */
router.get('/github', (req, res, next) => {
  // Verificar si GitHub OAuth está configurado
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      error: 'GitHub OAuth no está configurado',
      message: 'Las credenciales de GitHub no están disponibles',
      required: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']
    });
  }
  
  // Verificar si passport está disponible
  if (!passport) {
    return res.status(500).json({
      success: false,
      error: 'Passport no está disponible',
      message: 'Error interno del servidor OAuth'
    });
  }
  
  try {
    passport.authenticate('github', {
      scope: ['user:email']
    })(req, res, next);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error iniciando OAuth con GitHub',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: Callback de GitHub OAuth
 *     tags: [Authentication]
 *     description: Maneja la respuesta de GitHub después de la autorización
 */
router.get('/github/callback',
  passport.authenticate('github', { 
    failureRedirect: '/api/auth/failure'
  }),
  handleOAuthSuccess
);

/**
 * @swagger
 * /api/auth/failure:
 *   get:
 *     summary: Manejo de fallos de autenticación
 *     tags: [Authentication]
 */
router.get('/failure', handleOAuthFailure);

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Verificar estado de autenticación
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de autenticación
 *       401:
 *         description: No autenticado
 */
router.get('/status', (req, res) => {
  const isAuthenticated = req.user || (req.isAuthenticated && req.isAuthenticated());
  
  if (isAuthenticated) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user,
      message: 'Usuario autenticado correctamente'
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: 'No autenticado'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión del usuario
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 */
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Error al cerrar sesión'
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Error al limpiar sesión'
        });
      }
      
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    });
  });
});

/**
 * @swagger
 * /api/auth/test:
 *   get:
 *     summary: Test de configuración OAuth
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Estado de configuración OAuth
 */
router.get('/test', (req, res) => {
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const githubConfigured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  
  res.json({
    success: true,
    message: 'Test de configuración OAuth',
    data: {
      google: {
        configured: googleConfigured,
        status: googleConfigured ? 'Configurado ✅' : 'No configurado ❌'
      },
      github: {
        configured: githubConfigured,
        status: githubConfigured ? 'Configurado ✅' : 'No configurado ❌'
      },
      endpoints: {
        google: '/api/auth/google',
        github: '/api/auth/github',
        status: '/api/auth/status'
      }
    }
  });
});

module.exports = router;