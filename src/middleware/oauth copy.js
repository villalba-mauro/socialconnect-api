const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const { generateTokens } = require('./auth');

/**
 * Configuración de Passport para OAuth
 * passport.js es una biblioteca para autenticación en Node.js
 * Maneja múltiples estrategias de autenticación (Google, GitHub, etc.)
 */

/**
 * Serialización de usuario para sesiones
 * Determina qué datos del usuario se almacenan en la sesión
 * @param {Object} user - Usuario autenticado
 * @param {Function} done - Callback de finalización
 */
passport.serializeUser((user, done) => {
  // Solo almacenar el ID del usuario en la sesión
  done(null, user._id);
});

/**
 * Deserialización de usuario para sesiones  
 * Recupera el usuario completo basado en el ID almacenado en la sesión
 * @param {String} id - ID del usuario
 * @param {Function} done - Callback de finalización
 */
passport.deserializeUser(async (id, done) => {
  try {
    // Buscar usuario por ID excluyendo la contraseña
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Estrategia de autenticación con Google OAuth 2.0
 * Permite a los usuarios iniciar sesión con su cuenta de Google
 */
passport.use(new GoogleStrategy({
  // ID de cliente de Google (se obtiene en Google Cloud Console)
  clientID: process.env.GOOGLE_CLIENT_ID,
  
  // Secreto de cliente de Google
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  
  // URL donde Google redirigirá después de la autenticación
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Procesando autenticación con Google:', profile.id);
    
    // Buscar si ya existe un usuario con este ID de Google
    let user = await User.findOne({ 
      oauthId: profile.id, 
      oauthProvider: 'google' 
    });

    if (user) {
      // Usuario ya existe, actualizar último login
      console.log('✅ Usuario Google existente encontrado:', user.username);
      await user.updateLastLogin();
      return done(null, user);
    }

    // Verificar si ya existe un usuario con el mismo email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Usuario existe pero no tiene OAuth configurado
      // Vincular cuenta de Google a usuario existente
      console.log('🔗 Vinculando cuenta Google a usuario existente');
      user.oauthProvider = 'google';
      user.oauthId = profile.id;
      await user.save();
      await user.updateLastLogin();
      return done(null, user);
    }

    // Crear nuevo usuario con datos de Google
    console.log('🆕 Creando nuevo usuario desde Google');
    const newUser = await User.create({
      username: profile.emails[0].value.split('@')[0], // Usar parte del email como username
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      profilePicture: profile.photos[0]?.value,
      oauthProvider: 'google',
      oauthId: profile.id,
      // No se requiere contraseña para OAuth
    });

    console.log('✅ Usuario Google creado exitosamente:', newUser.username);
    await newUser.updateLastLogin();
    done(null, newUser);

  } catch (error) {
    console.error('❌ Error en autenticación Google:', error);
    done(error, null);
  }
}));

/**
 * Estrategia de autenticación con GitHub OAuth
 * Permite a los usuarios iniciar sesión con su cuenta de GitHub
 */
passport.use(new GitHubStrategy({
  // ID de cliente de GitHub (se obtiene en GitHub Developer Settings)
  clientID: process.env.GITHUB_CLIENT_ID,
  
  // Secreto de cliente de GitHub
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  
  // URL donde GitHub redirigirá después de la autenticación
  callbackURL: "/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Procesando autenticación con GitHub:', profile.id);
    
    // Buscar si ya existe un usuario con este ID de GitHub
    let user = await User.findOne({ 
      oauthId: profile.id.toString(), 
      oauthProvider: 'github' 
    });

    if (user) {
      // Usuario ya existe
      console.log('✅ Usuario GitHub existente encontrado:', user.username);
      await user.updateLastLogin();
      return done(null, user);
    }

    // Obtener email principal de GitHub
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    if (email) {
      // Verificar si ya existe un usuario con el mismo email
      user = await User.findOne({ email });
      
      if (user) {
        // Vincular cuenta de GitHub a usuario existente
        console.log('🔗 Vinculando cuenta GitHub a usuario existente');
        user.oauthProvider = 'github';
        user.oauthId = profile.id.toString();
        await user.save();
        await user.updateLastLogin();
        return done(null, user);
      }
    }

    // Crear nuevo usuario con datos de GitHub
    console.log('🆕 Creando nuevo usuario desde GitHub');
    const newUser = await User.create({
      username: profile.username || profile.displayName?.replace(/\s+/g, '_').toLowerCase(),
      email: email || `${profile.username}@github.local`, // Email temporal si no se proporciona
      firstName: profile.displayName?.split(' ')[0] || profile.username,
      lastName: profile.displayName?.split(' ')[1] || '',
      profilePicture: profile.photos[0]?.value,
      bio: profile._json?.bio || '',
      oauthProvider: 'github',
      oauthId: profile.id.toString(),
      // No se requiere contraseña para OAuth
    });

    console.log('✅ Usuario GitHub creado exitosamente:', newUser.username);
    await newUser.updateLastLogin();
    done(null, newUser);

  } catch (error) {
    console.error('❌ Error en autenticación GitHub:', error);
    done(error, null);
  }
}));

/**
 * Rutas de autenticación OAuth
 * Estas rutas manejan el flujo de autenticación con proveedores externos
 */

/**
 * Función para manejar el éxito de autenticación OAuth
 * Genera tokens JWT y redirige al frontend con los tokens
 * @param {Object} req - Objeto de petición
 * @param {Object} res - Objeto de respuesta
 */
const handleOAuthSuccess = async (req, res) => {
  try {
    // El usuario está disponible en req.user después de la autenticación exitosa
    const user = req.user;
    
    // Generar tokens JWT para el usuario autenticado
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Determinar URL de redirección del frontend
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Redirigir al frontend con los tokens en query params
    // En producción, considera usar cookies seguras en su lugar
    res.redirect(
      `${frontendURL}/auth/success?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture
      }))}`
    );
    
  } catch (error) {
    console.error('❌ Error en éxito OAuth:', error);
    
    // Redirigir al frontend con error
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendURL}/auth/error?message=authentication_failed`);
  }
};

/**
 * Función para manejar fallos de autenticación OAuth
 * Redirige al frontend con mensaje de error
 * @param {Object} req - Objeto de petición
 * @param {Object} res - Objeto de respuesta
 */
const handleOAuthFailure = (req, res) => {
  console.error('❌ Fallo en autenticación OAuth');
  
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendURL}/auth/error?message=authentication_failed`);
};

module.exports = {
  passport,
  handleOAuthSuccess,
  handleOAuthFailure
};