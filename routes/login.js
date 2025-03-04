const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/admin/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

router.get('/logout', (req, res) => {
    req.logout();const express = require('express');
    const passport = require('passport');
    const router = express.Router();
    
    router.get('/login', (req, res) => {
        res.render('login', { error: null });
    });
    
    router.post('/login', passport.authenticate('local', {
        successRedirect: '/admin/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    }));
    
    router.get('/logout', (req, res) => {
        req.logout();
        res.redirect('/login');
    });
    
    module.exports = router;
    res.redirect('/login');
});

module.exports = router;