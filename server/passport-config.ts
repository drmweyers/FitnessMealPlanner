import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import { comparePasswords } from './auth';
import { users } from '../shared/schema';

// User serialization for sessions
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy (existing email/password login)
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return done(null, false, { message: 'Invalid email or password' });
    }

    const isValid = await comparePasswords(password, user.passwordHash);
    if (!isValid) {
      return done(null, false, { message: 'Invalid email or password' });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  passReqToCallback: true
}, async (req: any, accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    const existingUser = await storage.getUserByGoogleId(profile.id);
    if (existingUser) {
      return done(null, existingUser);
    }

    // Check if user exists with the same email
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email provided by Google'), null);
    }

    const existingEmailUser = await storage.getUserByEmail(email);
    if (existingEmailUser) {
      // Link Google account to existing user
      await storage.linkGoogleAccount(existingEmailUser.id, profile.id);
      return done(null, existingEmailUser);
    }

    // Get intended role from session, default to customer
    const intendedRole = req.session?.intendedRole || 'customer';
    console.log('Creating new Google user - email:', email, 'role:', intendedRole);

    // Create new user with Google authentication
    const newUser = await storage.createGoogleUser({
      email,
      googleId: profile.id,
      name: profile.displayName || email.split('@')[0],
      profilePicture: profile.photos?.[0]?.value,
      role: intendedRole as 'admin' | 'trainer' | 'customer'
    });
    
    console.log('New user created:', newUser);
    return done(null, newUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

export default passport;