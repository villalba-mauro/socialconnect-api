// src/middleware/oauth.js - Versión corregida con redirección a API
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const { generateTokens } = require('./auth');

/**
 * Serialización de usuario para sesiones
 */
passport.serializeUser((user, done) => {
  done(null, user._id);
});

/**
 * Deserialización de usuario para sesiones
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Estrategia de Google OAuth con URL de callback robusta
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Construir URL de callback de manera robusta
  let googleCallbackURL;
  
  if (process.env.NODE_ENV === 'production') {
    // En producción, usar la URL externa de Render
    const baseURL = process.env.RENDER_EXTERNAL_URL || 'https://socialconnect-api-f7qx.onrender.com';
    googleCallbackURL = `${baseURL}/api/auth/google/callback`;
  } else {
    // En desarrollo, usar localhost
    const port = process.env.PORT || 3000;
    googleCallbackURL = `http://localhost:${port}/api/auth/google/callback`;
  }
  
  console.log('🔗 Google OAuth configurado con callback:', googleCallbackURL);
  
  try {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: googleCallbackURL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Buscar usuario existente por Google ID o email
        let user = await User.findOne({
          $or: [
            { oauthId: profile.id, oauthProvider: 'google' },
            { email: profile.emails[0].value }
          ]
        });

        if (user) {
          // Usuario existente
          if (!user.oauthId) {
            user.oauthId = profile.id;
            user.oauthProvider = 'google';
            await user.save();
          }
          await user.updateLastLogin();
          return done(null, user);
        }

        // Crear nuevo usuario con validaciones corregidas
        const baseUsername = profile.emails[0].value.split('@')[0];
        const timestamp = Date.now().toString().slice(-6); // Solo últimos 6 dígitos
        
        // Asegurar que el username no exceda 30 caracteres
        let username = `${baseUsername}_${timestamp}`;
        if (username.length > 30) {
          const maxBaseLength = 30 - timestamp.length - 1; // -1 para el '_'
          username = `${baseUsername.substring(0, maxBaseLength)}_${timestamp}`;
        }

        // Validar URL de imagen de Google o usar null
        let profilePicture = null;
        if (profile.photos && profile.photos[0] && profile.photos[0].value) {
          const imageUrl = profile.photos[0].value;
          // Google URLs son válidas, pero no terminan en extensiones tradicionales
          // Verificar que sea una URL de Google válida
          if (imageUrl.includes('googleusercontent.com') || imageUrl.includes('google.com')) {
            profilePicture = imageUrl;
          }
        }

        const newUser = await User.create({
          username: username,
          email: profile.emails[0].value,
          firstName: (profile.name.givenName || 'Usuario').substring(0, 50), // Límite 50 chars
          lastName: (profile.name.familyName || 'Google').substring(0, 50),  // Límite 50 chars
          profilePicture: profilePicture, // Puede ser null si no es válida
          oauthProvider: 'google',
          oauthId: profile.id,
          isActive: true
        });

        await newUser.updateLastLogin();
        return done(null, newUser);

      } catch (error) {
        console.error('❌ Error en callback de Google OAuth:', error);
        return done(error, null);
      }
    }));
    
    console.log('✅ Estrategia Google OAuth configurada exitosamente');
  } catch (error) {
    console.error('❌ Error configurando Google OAuth strategy:', error);
  }
} else {
  console.log('⚠️ Google OAuth deshabilitado - Credenciales faltantes');
}

/**
 * Estrategia de GitHub OAuth con URL de callback robusta
 */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  // Construir URL de callback de manera robusta
  let githubCallbackURL;
  
  if (process.env.NODE_ENV === 'production') {
    // En producción, usar la URL externa de Render
    const baseURL = process.env.RENDER_EXTERNAL_URL || 'https://socialconnect-api-f7qx.onrender.com';
    githubCallbackURL = `${baseURL}/api/auth/github/callback`;
  } else {
    // En desarrollo, usar localhost
    const port = process.env.PORT || 3000;
    githubCallbackURL = `http://localhost:${port}/api/auth/github/callback`;
  }
  
  console.log('🔗 GitHub OAuth configurado con callback:', githubCallbackURL);
  
  try {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: githubCallbackURL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Buscar usuario existente
        let user = await User.findOne({
          $or: [
            { oauthId: profile.id.toString(), oauthProvider: 'github' },
            { email: profile.emails?.[0]?.value }
          ]
        });

        if (user) {
          // Usuario existente
          if (!user.oauthId) {
            user.oauthId = profile.id.toString();
            user.oauthProvider = 'github';
            await user.save();
          }
          await user.updateLastLogin();
          return done(null, user);
        }

        // Crear nuevo usuario con validaciones corregidas
        const baseUsername = profile.username || 'github_user';
        const timestamp = Date.now().toString().slice(-6); // Solo últimos 6 dígitos
        
        // Asegurar que el username no exceda 30 caracteres
        let username = `${baseUsername}_${timestamp}`;
        if (username.length > 30) {
          const maxBaseLength = 30 - timestamp.length - 1; // -1 para el '_'
          username = `${baseUsername.substring(0, maxBaseLength)}_${timestamp}`;
        }

        // Validar URL de imagen de GitHub o usar null
        let profilePicture = null;
        if (profile.photos && profile.photos[0] && profile.photos[0].value) {
          const imageUrl = profile.photos[0].value;
          // GitHub URLs son válidas
          if (imageUrl.includes('github.com') || imageUrl.includes('githubusercontent.com')) {
            profilePicture = imageUrl;
          }
        }

        const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
        const newUser = await User.create({
          username: username,
          email: email,
          firstName: (profile.displayName?.split(' ')[0] || profile.username || 'GitHub').substring(0, 50),
          lastName: (profile.displayName?.split(' ')[1] || 'User').substring(0, 50),
          profilePicture: profilePicture, // Puede ser null si no es válida
          bio: (profile._json?.bio || '').substring(0, 500), // Límite 500 chars para bio
          oauthProvider: 'github',
          oauthId: profile.id.toString(),
          isActive: true
        });

        await newUser.updateLastLogin();
        return done(null, newUser);

      } catch (error) {
        console.error('❌ Error en callback de GitHub OAuth:', error);
        return done(error, null);
      }
    }));
    
    console.log('✅ Estrategia GitHub OAuth configurada exitosamente');
  } catch (error) {
    console.error('❌ Error configurando GitHub OAuth strategy:', error);
  }
} else {
  console.log('⚠️ GitHub OAuth deshabilitado - Credenciales faltantes');
}

/**
 * Manejar éxito de autenticación OAuth
 * ¡CORREGIDO! Ahora redirige a /api/auth/success
 */
const handleOAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      throw new Error('No se encontró información del usuario después de OAuth');
    }

    console.log('🎉 OAuth exitoso para:', req.user.username);

    // Generar tokens JWT usando la función de auth.js
    const { accessToken, refreshToken } = generateTokens(req.user._id);

    // Respuesta con usuario + tokens
    res.status(200).json({
      success: true,
      message: 'Autenticación OAuth completada exitosamente',
      provider: req.user.oauthProvider,
      tokens: {
        accessToken,
        refreshToken
      },
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email
        },
        authentication: {
          status: 'successful',
          provider: req.user.oauthProvider,
          timestamp: new Date().toISOString()
        }
      },
      note: 'Incluye este accessToken en la cabecera Authorization como "Bearer <token>" para acceder a rutas protegidas'
    });

  } catch (error) {
    console.error('❌ Error manejando éxito OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando autenticación OAuth',
      message: error.message,
      provider: 'OAuth',
      timestamp: new Date().toISOString()
    });
  }
};


/**
 * Manejar fallo de autenticación OAuth
 * ¡CORREGIDO! Ahora redirige a /api/auth/error
 */
const handleOAuthFailure = (req, res) => {
  let baseURL;
  if (process.env.NODE_ENV === 'production') {
    baseURL = process.env.RENDER_EXTERNAL_URL || 'https://socialconnect-api-f7qx.onrender.com';
  } else {
    baseURL = `http://localhost:${process.env.PORT || 3000}`;
  }
  // ¡CORREGIDO! Redirigir a /api/auth/error (no /auth/error)
  res.redirect(`${baseURL}/api/auth/error?message=${encodeURIComponent('Error en la autenticación OAuth')}`);
};

module.exports = {
  passport,
  handleOAuthSuccess,
  handleOAuthFailure
};