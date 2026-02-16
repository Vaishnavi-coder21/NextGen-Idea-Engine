const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '../../data/users.json');

// Master Access Users (Guaranteed to work even if filesystem is read-only)
const PRIMARY_USERS = [
    {
        email: 'vaishnavi@example.com',
        password: 'password123',
        name: 'Vaishnavi Patil'
    },
    {
        email: 'vaishnavipatil0521@gmail.com',
        password: 'password123', // Default master password
        name: 'Vaishnavi Patil'
    }
];

const readUsers = () => {
    let users = [...PRIMARY_USERS];
    try {
        if (fs.existsSync(USERS_PATH)) {
            const raw = fs.readFileSync(USERS_PATH, 'utf8');
            const fileUsers = JSON.parse(raw);
            // Merge file users, avoiding duplicates with PRIMARY_USERS
            fileUsers.forEach(fu => {
                if (!users.find(u => u.email === fu.email)) {
                    users.push(fu);
                }
            });
        }
    } catch (err) {
        console.warn('Auth Persistence Load Warning:', err.message);
    }
    return users;
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

        const allUsers = readUsers();
        if (allUsers.find(u => u.email === email)) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // For persistence, we only write the NEW user to the file
        let fileUsers = [];
        try {
            if (fs.existsSync(USERS_PATH)) {
                fileUsers = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
            }
        } catch (e) { }

        const newUser = { id: Date.now(), email, password, name, type: 'email' };
        fileUsers.push(newUser);

        try {
            if (!fs.existsSync(path.dirname(USERS_PATH))) {
                fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
            }
            fs.writeFileSync(USERS_PATH, JSON.stringify(fileUsers, null, 2));
        } catch (e) {
            console.warn('Signup Persistence skipped (Prod/Read-only):', e.message);
        }

        res.status(201).json({ message: 'User created successfully', user: { email, name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = readUsers();
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
        const users = readUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address.' });
        }

        const token = Math.random().toString(36).substring(7);
        user.resetToken = token;

        // Try to persist the token if possible for file-based users
        try {
            if (fs.existsSync(USERS_PATH)) {
                let fileUsers = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
                const fUser = fileUsers.find(u => u.email === email);
                if (fUser) {
                    fUser.resetToken = token;
                    fs.writeFileSync(USERS_PATH, JSON.stringify(fileUsers, null, 2));
                }
            }
        } catch (e) { }

        res.json({ message: 'Reset link sent! Please check your inbox.', token });
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
            // Check if it's a primary user (resetting in memory only if token matches)
            const pUser = PRIMARY_USERS.find(u => u.email === email);
            if (pUser && token && pUser.resetToken === token) {
                pUser.password = newPassword;
                return res.json({ message: 'Password reset successful!' });
            }
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        user.password = newPassword;
        delete user.resetToken;

        try {
            if (fs.existsSync(USERS_PATH)) {
                let fileUsers = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
                const fUser = fileUsers.find(u => u.email === email);
                if (fUser) {
                    fUser.password = newPassword;
                    delete fUser.resetToken;
                    fs.writeFileSync(USERS_PATH, JSON.stringify(fileUsers, null, 2));
                }
            }
        } catch (e) { }

        res.json({ message: 'Password reset successful! You can now login.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/google', async (req, res) => {
    try {
        const { email, name, googleId } = req.body;
        const users = readUsers();
        let user = users.find(u => u.email === email);

        if (!user) {
            user = { id: Date.now(), email, name, googleId, type: 'google' };
            // Try to persist new Google user
            try {
                let fileUsers = [];
                if (fs.existsSync(USERS_PATH)) {
                    fileUsers = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
                }
                fileUsers.push(user);
                fs.writeFileSync(USERS_PATH, JSON.stringify(fileUsers, null, 2));
            } catch (e) { }
        }

        res.json({ message: 'Google login successful', user: { email, name: user.name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
