const bcrypt = require('bcryptjs');
async function test() {
    const hash = await bcrypt.hash('password', 10);
    console.log(hash);
}
test();
