const { spawn } = require('child_process');
const server = spawn('node', ['backend/server.js'], { stdio: 'inherit' });

server.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
});

server.on('error', (err) => {
    console.error('Failed to start child process:', err);
});

process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));

console.log('Wrapper started. Waiting for server...');
