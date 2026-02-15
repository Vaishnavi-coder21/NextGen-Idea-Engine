const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '../../data/users.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../../data'))) {
    fs.mkdirSync(path.join(__dirname, '../../data'));
}
if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify([]));
}

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
            return res.status(400).json({ message: 'Invalid email format. Please provide a valid email address.' });
        }

        const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));

        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = { id: Date.now(), email, password, name, type: 'email' };
        users.push(newUser);
        fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));

        res.status(201).json({ message: 'User created', user: { email, name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));

        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials. Please check your email and password.' });
        }

        res.json({ message: 'Login successful', user: { email, name: user.name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address.' });
        }

        // Simulate sending an email with a token
        const token = Math.random().toString(36).substring(7);
        user.resetToken = token;
        fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));

        res.json({ message: 'Reset link sent! Please check your inbox.', token }); // Token included for simulation
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
        const user = users.find(u => u.email === email && u.resetToken === token);

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        user.password = newPassword;
        delete user.resetToken;
        fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));

        res.json({ message: 'Password reset successful! You can now login.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/google', async (req, res) => {
    try {
        const { email, name, googleId } = req.body;
        const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));

        let user = users.find(u => u.email === email);
        if (!user) {
            user = { id: Date.now(), email, name, googleId, type: 'google' };
            users.push(user);
            fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
        }

        res.json({ message: 'Google login successful', user: { email, name: user.name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
