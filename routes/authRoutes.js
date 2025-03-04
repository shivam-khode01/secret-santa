const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/user');
const Group = require('../models/group');

// Home Page
router.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

// Show Registration Form
router.get('/register', (req, res) => {
    res.render('register', { 
        title: 'Register', 
        error: null 
    });
});

// Handle Registration
router.post('/register', async (req, res) => {
    const { name, email, password, wishlist, hint, groupCode } = req.body;

    try {
        // Check if group code exists
        const group = await Group.findOne({ code: groupCode });
        if (!group) {
            return res.render('register', { 
                title: 'Register', 
                error: 'Invalid group code. Please check and try again.' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('register', { 
                title: 'Register', 
                error: 'Email already registered. Try a different one.' 
            });
        }

        // Create new user and add to group
        const newUser = new User({ 
            name, 
            email, 
            password, 
            wishlist: wishlist ? wishlist.split(',').map(item => item.trim()) : [], 
            hint, 
            group: group._id 
        });
        await newUser.save();

        // Add user to group members
        group.members.push(newUser._id);
        await group.save();

        res.render('success', { 
            title: 'Success', 
            message: 'Registration successful! You can now login.' 
        });
    } catch (err) {
        console.error(err);
        res.render('register', { 
            title: 'Register', 
            error: 'Something went wrong. Please try again.' 
        });
    }
});
// Show Login Form
router.get('/login', (req, res) => {
    res.render('login', { 
        title: 'Login', 
        error: null 
    });
});

// Handle Login
router.post('/login', passport.authenticate('local', {
    successRedirect: '/admin/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { 
            console.error('Logout error:', err); 
        }
        res.redirect('/login');
    });
});

module.exports = router;