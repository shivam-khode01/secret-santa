const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                console.log('Incorrect email');
                return done(null, false, { message: 'Incorrect email.' });
            }
            console.log('User found:', user);
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                console.log('Incorrect password');
                return done(null, false, { message: 'Incorrect password.' });
            }
            console.log('Authentication successful');
            return done(null, user);
        } catch (err) {
            console.log('Error during authentication:', err);
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;