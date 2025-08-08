// src/middleware/oauth.js - Configuración OAuth sin debug
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
 * Estrategia de Google OAuth
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
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

      // Crear nuevo usuario
      const newUser = await User.create({
        username: profile.emails[0].value.split('@')[0] + '_' + Date.now(),
        email: profile.emails[0].value,
        firstName: profile.name.givenName || 'Usuario',
        lastName: profile.name.familyName || 'Google',
        profilePicture: profile.photos[0]?.value,
        oauthProvider: 'google',
        oauthId: profile.id,
        isActive: true
      });

      await newUser.updateLastLogin();
      return done(null, newUser);

    } catch (error) {
      return done(error, null);
    }
  }));
}

/**
 * Estrategia de GitHub OAuth
 */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/api/auth/github/callback"
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

      // Crear nuevo usuario
      const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
      const newUser = await User.create({
        username: profile.username + '_' + Date.now(),
        email: email,
        firstName: profile.displayName?.split(' ')[0] || profile.username,
        lastName: profile.displayName?.split(' ')[1] || 'GitHub',
        profilePicture: profile.photos[0]?.value,
        bio: profile._json?.bio || '',
        oauthProvider: 'github',
        oauthId: profile.id.toString(),
        isActive: true
      });

      await newUser.updateLastLogin();
      return done(null, newUser);

    } catch (error) {
      return done(error, null);
    }
  }));
}

/**
 * Manejar éxito de autenticación OAuth
 */
const handleOAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      throw new Error('No se encontró información del usuario después de OAuth');
    }

    // Generar tokens JWT
    const { accessToken, refreshToken } = generateTokens(req.user._id);
    
    // URL del frontend
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    
    // Crear URL de redirección con tokens
    const redirectURL = `${frontendURL}/auth/success?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profilePicture: req.user.profilePicture
    }))}`;

    res.redirect(redirectURL);

  } catch (error) {
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendURL}/auth/error?message=${encodeURIComponent('Error en la autenticación')}`);
  }
};

/**
 * Manejar fallo de autenticación OAuth
 */
const handleOAuthFailure = (req, res) => {
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
  res.redirect(`${frontendURL}/auth/error?message=${encodeURIComponent('Error en la autenticación')}`);
};

module.exports = {
  passport,
  handleOAuthSuccess,
  handleOAuthFailure
};