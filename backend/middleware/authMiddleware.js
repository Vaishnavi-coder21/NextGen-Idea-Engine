const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'nextgen_secret_key_2025';

const auth = (roles = []) => {
    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required. Please log in.' 
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            
            req.user = decoded;

            // Role check
            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Forbidden: This action requires one of the following roles: ${roles.join(', ')}` 
                });
            }

            next();
        } catch (err) {
            console.error('Auth Middleware Error:', err.message);
            const message = err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid session';
            res.status(401).json({ success: false, message });
        }
    };
};

module.exports = auth;
