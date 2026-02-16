const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '../../data/users.json');

// Primary User Lock for Vaishnavi Patil
const PRIMARY_USER = {
    email: 'vaishnavi@example.com',
    password: 'password123',
    name: 'Vaishnavi Patil'
};

const readUsers = () => {
    try {
        if (fs.existsSync(USERS_PATH)) {
            const raw = fs.readFileSync(USERS_PATH, 'utf8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.warn('Auth Load Warning:', err.message);
    }
    return [PRIMARY_USER];
};

const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        const users = readUsers();
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = { id: Date.now(), email, password, name, type: 'email' };
        users.push(newUser);

        try {
            fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
        } catch (e) {
            console.warn('Signup Persistence skipped (Prod):', e.message);
        }

        res.status(201).json({ message: 'User created', user: { email, name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Forced bypass for Primary User
        if (email === PRIMARY_USER.email && password === PRIMARY_USER.password) {
            return res.json({ message: 'Login successful', user: { email, name: PRIMARY_USER.name } });
        }

        const users = readUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        res.json({ message: 'Login successful', user: { email, name: user.name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const users = readUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(404).json({ message: 'No account found.' });
        }

        const token = Math.random().toString(36).substring(7);
        user.resetToken = token;

        try {
            fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
        } catch (e) { }

        res.json({ message: 'Reset link sent!', token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const users = readUsers();
        const user = users.find(u => u.email === email && u.resetToken === token);

        if (!user) {
            return res.status(400).json({ message: 'Invalid token.' });
        }

        user.password = newPassword;
        delete user.resetToken;

        try {
            fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
        } catch (e) { }

        res.json({ message: 'Password reset successful!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/google', async (req, res) => {
    try {
        const { email, name, googleId } = req.body;

        if (email === PRIMARY_USER.email) {
            return res.json({ message: 'Google login successful', user: { email, name: PRIMARY_USER.name } });
        }

        const users = readUsers();
        let user = users.find(u => u.email === email);
        if (!user) {
            user = { id: Date.now(), email, name, googleId, type: 'google' };
            users.push(user);
            try {
                fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
            } catch (e) { }
        }

        res.json({ message: 'Google login successful', user: { email, name: user.name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
