// src/middleware/oauth.js - Configuración robusta de OAuth que no falla si no hay credenciales
const passport = require('passport');

// Solo importar estrategias si las necesitamos
let GoogleStrategy = null;
let GitHubStrategy = null;
let User = null;
let generateTokens = null;

/**
 * Verificar si las credenciales OAuth están disponibles
 * @returns {Object} Estado de las credenciales disponibles
 */
const checkCredentials = () => {
  const google = {
    available: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  };
  
  const github = {
    available: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  };

  return { google, github };
};

// Verificar credenciales al inicio
const credentials = checkCredentials();
const hasAnyCredentials = credentials.google.available || credentials.github.available;

console.log('🔍 Estado de credenciales OAuth:');
console.log(`   Google: ${credentials.google.available ? '✅ Disponible' : '❌ No configurado'}`);
console.log(`   GitHub: ${credentials.github.available ? '✅ Disponible' : '❌ No configurado'}`);

/**
 * Configurar estrategias OAuth solo si las credenciales están disponibles
 */
if (hasAnyCredentials) {
  try {
    // Importar dependencias solo si las necesitamos
    if (credentials.google.available) {
      GoogleStrategy = require('passport-google-oauth20').Strategy;
    }
    if (credentials.github.available) {
      GitHubStrategy = require('passport-github2').Strategy;
    }
    User = require('../models/User');
    generateTokens = require('./auth').generateTokens;
    
    console.log('✅ Dependencias OAuth importadas correctamente');
  } catch (error) {
    console.error('❌ Error importando dependencias OAuth:', error.message);
    console.error('   OAuth será deshabilitado');
  }
}

/**
 * Configurar estrategia de Google OAuth si está disponible
 */
if (credentials.google.available && GoogleStrategy && User) {
  try {
    passport.use(new GoogleStrategy({
      clientID: credentials.google.clientId,
      clientSecret: credentials.google.clientSecret,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Procesando autenticación con Google para:', profile.emails[0].value);
        
        // Buscar usuario existente
        let existingUser = await User.findOne({ 
          $or: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        });

        if (existingUser) {
          if (!existingUser.googleId) {
            existingUser.googleId = profile.id;
            await existingUser.save();
          }
          console.log('✅ Usuario existente autenticado:', existingUser.email);
          return done(null, existingUser);
        }

        // Crear nuevo usuario
        const newUser = await User.create({
          googleId: profile.id,
          username: profile.emails[0].value.split('@')[0] + '_' + Date.now(),
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          profilePicture: profile.photos[0]?.value,
          isEmailVerified: true,
          authProvider: 'google'
        });

        console.log('✅ Nuevo usuario creado desde Google:', newUser.email);
        return done(null, newUser);

      } catch (error) {
        console.error('❌ Error en autenticación Google:', error);
        return done(error, null);
      }
    }));
    
    console.log('✅ Estrategia de Google OAuth configurada');
  } catch (error) {
    console.error('❌ Error configurando estrategia Google:', error.message);
  }
} else {
  console.log('⚠️  Estrategia de Google OAuth omitida');
  if (!credentials.google.available) {
    console.log('   Razón: Credenciales no configuradas');
  }
}

/**
 * Configurar estrategia de GitHub OAuth si está disponible
 */
if (credentials.github.available && GitHubStrategy && User) {
  try {
    passport.use(new GitHubStrategy({
      clientID: credentials.github.clientId,
      clientSecret: credentials.github.clientSecret,
      callbackURL: process.env.GITHUB_CALLBACK_URL || "/api/auth/github/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Procesando autenticación con GitHub para:', profile.username);
        
        let existingUser = await User.findOne({ 
          $or: [
            { githubId: profile.id },
            { email: profile.emails?.[0]?.value }
          ]
        });

        if (existingUser) {
          if (!existingUser.githubId) {
            existingUser.githubId = profile.id;
            await existingUser.save();
          }
          console.log('✅ Usuario existente autenticado:', existingUser.username);
          return done(null, existingUser);
        }

        const newUser = await User.create({
          githubId: profile.id,
          username: profile.username || profile.displayName.replace(/\s+/g, '_').toLowerCase(),
          email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
          firstName: profile.displayName?.split(' ')[0] || profile.username,
          lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
          profilePicture: profile.photos[0]?.value,
          bio: profile._json.bio,
          isEmailVerified: profile.emails?.[0]?.value ? true : false,
          authProvider: 'github'
        });

        console.log('✅ Nuevo usuario creado desde GitHub:', newUser.username);
        return done(null, newUser);

      } catch (error) {
        console.error('❌ Error en autenticación GitHub:', error);
        return done(error, null);
      }
    }));
    
    console.log('✅ Estrategia de GitHub OAuth configurada');
  } catch (error) {
    console.error('❌ Error configurando estrategia GitHub:', error.message);
  }
} else {
  console.log('⚠️  Estrategia de GitHub OAuth omitida');
  if (!credentials.github.available) {
    console.log('   Razón: Credenciales no configuradas');
  }
}

/**
 * Configurar serialización solo si hay OAuth habilitado
 */
if (hasAnyCredentials && User) {
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
  
  console.log('✅ Serialización de Passport configurada');
}

/**
 * Manejar éxito de autenticación OAuth
 */
const handleOAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      throw new Error('No se encontró información del usuario');
    }

    const { accessToken, refreshToken } = generateTokens(req.user._id);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const redirectURL = `${frontendURL}/auth/success?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profilePicture: req.user.profilePicture
    }))}`;

    console.log('🎉 Autenticación OAuth exitosa, redirigiendo...');
    res.redirect(redirectURL);

  } catch (error) {
    console.error('❌ Error manejando éxito OAuth:', error);
    handleOAuthFailure(req, res);
  }
};

/**
 * Manejar fallo de autenticación OAuth
 */
const handleOAuthFailure = (req, res) => {
  console.error('❌ Fallo en autenticación OAuth');
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const errorURL = `${frontendURL}/auth/error?message=${encodeURIComponent('Error en la autenticación')}`;
  res.redirect(errorURL);
};

/**
 * Middleware para verificar si OAuth está disponible
 */
const requireOAuth = (provider) => (req, res, next) => {
  const providerAvailable = provider.toLowerCase() === 'google' ? 
    credentials.google.available : credentials.github.available;
    
  if (!providerAvailable) {
    return res.status(503).json({
      success: false,
      error: `${provider} OAuth no está configurado`,
      message: 'Configura las credenciales en las variables de entorno para habilitar OAuth',
      required: provider.toLowerCase() === 'google' ? 
        ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] :
        ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']
    });
  }
  next();
};

module.exports = {
  passport: hasAnyCredentials ? passport : null,
  handleOAuthSuccess,
  handleOAuthFailure,
  requireOAuth,
  isOAuthEnabled: hasAnyCredentials,
  credentials: credentials
};