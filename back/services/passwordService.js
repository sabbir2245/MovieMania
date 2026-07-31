const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, storedHash) {
  try {
    return await bcrypt.compare(plainPassword, storedHash);
  } catch (err) {
    return false;
  }
}

// Legacy rows stored plaintext before hashing was introduced. Detect them so we
// can upgrade them in place on the next successful sign-in.
function isBcryptHash(value) {
  return typeof value === 'string' && value.startsWith('$2');
}

module.exports = { hashPassword, verifyPassword, isBcryptHash };
