const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Group = require('../models/group'); // Import Group model
const passport = require('passport');
const isAuthenticated = require('../middleware/authentication'); // Import the middleware

// Home Page
router.get('/', (req, res) => {
    res.render('index', { title: 'Home' });  // Ensure you have a home.ejs file in views/
});

// Show Registration Form
router.get('/register', (req, res) => {
    res.render('register', { title: 'register', error: 'register route not found !!!' });
});

// Handle RegistrationS*0
router.post('/register', async (req, res) => {
    const { name, email, password, wishlist, hint, groupCode } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('register', { title: 'Register', error: 'Email already registered. Try a different one.' });
        }

        let group = null;
        if (groupCode) {
            group = await Group.findOne({ code: groupCode });
            if (!group) {
                return res.render('register', { title: 'Register', error: 'Invalid group code.' });
            }
        }

        const newUser = new User({ name, email, password, wishlist, hint, group: group ? group._id : null });
        await newUser.save();

        if (group) {
            group.members.push(newUser._id);
            await group.save();
        }

        res.render('success', { title: 'Success', message: 'Thank you for registering!' });
    } catch (err) {
        console.error(err);
        res.render('register', { title: 'Register', error: 'Something went wrong. Please try again.' });
    }
});

// Show Login Form
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login', error: req.flash('error') });
});

// Handle Login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            console.log('Error during authentication:', err);
            return next(err);
        }
        if (!user) {
            console.log('Authentication failed:', info.message);
            return res.redirect('/login');
        }
        req.logIn(user, async (err) => {
            if (err) {
                console.log('Error during login:', err);
                return next(err);
            }

            const { groupCode } = req.body;
            if (groupCode) {
                try {
                    const group = await Group.findOne({ code: groupCode });
                    if (group) {
                        user.group = group._id;
                        await user.save();
                        group.members.push(user._id);
                        await group.save();
                    } else {
                        req.flash('error', 'Invalid group code.');
                        return res.redirect('/login');
                    }
                } catch (err) {
                    console.log('Error during group assignment:', err);
                    req.flash('error', 'Something went wrong. Please try again.');
                    return res.redirect('/login');
                }
            }

            console.log('Login successful, redirecting to dashboard');
            return res.redirect('/admin/dashboard');
        });
    })(req, res, next);
});

// Success Page
router.get('/success', (req, res) => {
    res.render('success', { title: 'Success' }); // Ensure success.ejs exists
});

// Admin Dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Fetch all users, populate santaFor and group
        const users = await User.find()
            .populate('santaFor')
            .populate({
                path: 'group',
                populate: { path: 'members', populate: { path: 'santaFor' } }
            });

        // Fetch all groups with their members
        const groups = await Group.find().populate({
            path: 'members',
            populate: { path: 'santaFor' }
        });

        res.render('admin/dashboard', { 
            title: 'Admin Dashboard', 
            users, 
            groups 
        });
    } catch (err) {
        console.error(err);
        res.render('error', { 
            title: 'Error', 
            error: 'Could not load dashboard.' 
        });
    }
});
// Pair Users (mounted under /admin, so endpoint becomes /admin/pair)
router.post('/pair', isAuthenticated, async (req, res) => {
    console.log("DEBUG: /admin/pair route called");
    console.log("DEBUG: Request body:", req.body);
    try {
        const users = await User.find();
        console.log("DEBUG: Users fetched from DB:", users);
        const shuffledUsers = users.sort(() => 0.5 - Math.random());
        console.log("DEBUG: Shuffled users:", shuffledUsers);

        for (let i = 0; i < shuffledUsers.length; i++) {
            const santa = shuffledUsers[i];
            const recipient = shuffledUsers[(i + 1) % shuffledUsers.length];
            console.log(`DEBUG: Pairing ${santa.name} (${santa._id}) with ${recipient.name} (${recipient._id})`);
            santa.santaFor = recipient._id;
            await santa.save();
        }

        const updatedUsers = await User.find().populate('santaFor');
        console.log("DEBUG: Updated users after pairing:", updatedUsers);
        res.json({ users: updatedUsers });
    } catch (err) {
        console.error("DEBUG: Error in pairing route:", err);
        res.status(500).json({ error: 'Could not pair users.' });
    }
});

// Create Group
router.post('/groups', isAuthenticated, async (req, res) => {
    const { name, code } = req.body;
    try {
        const existingGroup = await Group.findOne({ code });
        if (existingGroup) {
            return res.status(400).json({ error: 'Group code already exists.' });
        }

        const newGroup = new Group({ name, code });
        await newGroup.save();
        res.json({ message: 'Group created successfully', group: newGroup });
    } catch (err) {
        console.error("DEBUG: Error creating group:", err);
        res.status(500).json({ error: 'Could not create group.' });
    }
});

// Delete Group
router.delete('/groups/:id', isAuthenticated, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findByIdAndDelete(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Remove group reference from users
        await User.updateMany({ group: groupId }, { $unset: { group: "" } });

        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        console.error("DEBUG: Error deleting group:", err);
        res.status(500).json({ error: 'Could not delete group' });
    }
});

// Other admin routes...
// Pairing Control
router.post('/pairs/regenerate', isAuthenticated, (req, res) => {
    res.send('Pairs regenerated');
});

module.exports = router;