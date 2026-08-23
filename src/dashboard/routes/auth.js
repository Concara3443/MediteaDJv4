const express = require('express');

module.exports = (passport) => {
    const router = express.Router();

    // Ruta de inicio de sesión
    router.get('/login', passport.authenticate('discord'));

    // Callback de Discord OAuth2
    router.get('/callback',
        passport.authenticate('discord', { failureRedirect: '/login' }),
        (req, res) => {
            res.redirect('/dashboard');
        }
    );

    // Cerrar sesión
    router.get('/logout', (req, res) => {
        req.logout((err) => {
            if (err) {
                console.error('[Dashboard] Error al cerrar sesión:', err);
            }
            res.redirect('/');
        });
    });

    return router;
};
