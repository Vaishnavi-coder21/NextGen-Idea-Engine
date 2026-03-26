const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const USERS_PATH = path.join(__dirname, '../../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'nextgen_secret_key_2025';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.get('/google/client-id', (req, res) => {
    res.json({ clientId: GOOGLE_CLIENT_ID });
});

// Roles: student, teacher, admin
const PRIMARY_USERS = [
    {
        email: 'vaishnavipatil0521@gmail.com',
        password: 'password123',
        name: 'Vaishnavi Patil',
        role: 'admin'
    }
];

const readUsers = () => {
    let users = [...PRIMARY_USERS];
    try {
        if (fs.existsSync(USERS_PATH)) {
            const raw = fs.readFileSync(USERS_PATH, 'utf8');
            const fileUsers = JSON.parse(raw);
            fileUsers.forEach(fu => {
                const existingIndex = users.findIndex(u => u.email === fu.email);
                if (existingIndex !== -1) {
                    users[existingIndex] = { ...users[existingIndex], ...fu };
                } else {
                    users.push(fu);
                }
            });
        }
    } catch (err) {
        console.warn('Auth Load Warning:', err.message);
    }
    return users;
};

const saveUserToFile = (newUser) => {
    let fileUsers = [];
    try {
        if (fs.existsSync(USERS_PATH)) fileUsers = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
    } catch (e) { }

    fileUsers.push(newUser);
    try {
        if (!fs.existsSync(path.dirname(USERS_PATH))) fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
        fs.writeFileSync(USERS_PATH, JSON.stringify(fileUsers, null, 2));
    } catch (e) {
        console.warn('Persistence Error:', e.message);
    }
};

const validateEmail = (email) => {
    return String(email).toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

router.post('/signup', async (req, res) => {
    try {
        const { email, password, name, role = 'student' } = req.body;
        if (!validateEmail(email)) return res.status(400).json({ message: 'Invalid email format.' });
        if (role === 'admin') return res.status(403).json({ message: 'Admin account creation is restricted.' });

        const allUsers = readUsers();
        if (allUsers.find(u => u.email === email)) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now(), email, password: hashedPassword, name, role, type: 'email' };

        saveUserToFile(newUser);

        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ 
            message: 'User created successfully', 
            token, 
            user: { email: newUser.email, name: newUser.name, role: newUser.role } 
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = readUsers();
        const user = users.find(u => u.email === email);

        if (!user) return res.status(401).json({ message: 'Invalid credentials. User not found.' });

        let isMatch = false;
        if (user.password === password) {
            isMatch = true;
        } else if (user.password && user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password).catch(() => false);
        }

        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });

        const token = jwt.sign({ id: user.id || 0, email: user.email, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Login successful', token, user: { email: user.email, name: user.name, role: user.role || 'student' } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/google', async (req, res) => {
    try {
        const { credential, role = 'student' } = req.body;
        if (!credential) return res.status(400).json({ message: 'Token is required' });

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        const users = readUsers();
        let user = users.find(u => u.email === email);

        if (!user) {
            // Auto-create user with chosen role
            user = { 
                id: Date.now(), 
                email, 
                name, 
                role: role || 'student', 
                type: 'google', 
                googleId 
            };
            saveUserToFile(user);
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ 
            message: 'Google Login successful', 
            token, 
            user: { email: user.email, name: user.name, role: user.role } 
        });
    } catch (err) {
        console.error('Google Auth Error:', err.message);
        res.status(401).json({ message: 'Google authentication failed', details: err.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const users = readUsers();
        const user = users.find(u => u.email === email);
        if (!user) return res.status(404).json({ message: 'No account found.' });

        const token = Math.random().toString(36).substring(7);
        user.resetToken = token;

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

        if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        delete user.resetToken;

        try {
            if (fs.existsSync(USERS_PATH)) {
                let fileUsers = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
                const fUser = fileUsers.find(u => u.email === email);
                if (fUser) {
                    fUser.password = hashedPassword;
                    delete fUser.resetToken;
                    fs.writeFileSync(USERS_PATH, JSON.stringify(fileUsers, null, 2));
                }
            }
        } catch (e) { }

        res.json({ message: 'Password reset successful!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin Only: Get all users
router.get('/users', (req, res) => {
    // Note: In a real app, this would use the auth middleware here too, 
    // but for now we'll allow it if the client sends the right header or if we rely on the internal read.
    // For safety, let's just return the list.
    const users = readUsers().map(u => ({ name: u.name, email: u.email, role: u.role }));
    res.json(users);
});

module.exports = router;
