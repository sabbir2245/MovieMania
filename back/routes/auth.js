const express = require('express');
const router = express.Router();
const { pool } = require('../pool');
const { hashPassword, verifyPassword, isBcryptHash } = require('../services/passwordService');
const { sendWelcomeEmail } = require('../services/emailService');
const { issueToken } = require('../middleware/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function signup(username, name, email, birthDate, password) {
  const hashedPassword = await hashPassword(password);
  const query = `
    INSERT INTO "Users" (username, "Name", "Email", "BirthDate", password)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const values = [username, name, email, birthDate, hashedPassword];

  try {
    await pool.query(query, values);
    console.log('✅ User registered:', username);
    return true;
  } catch (err) {
    console.error('Signup error:', err);

    if (err.code === '23505') { // unique violation
      console.error('❌ Username or Email already exists');
    }

    // Check for invalid input errors
    if (err.code === '22007') { // invalid_datetime format
      console.error('❌ Invalid date format for BirthDate');
    }

    return false;
  }
}

async function signin(username, password) {
  const query = `
    SELECT username, "Name", "Email", "BirthDate", password, iseditor
    FROM "Users"
    WHERE username = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [username]);
  if (result.rows.length !== 1) {
    return { user: null }; // invalid credentials
  }

  const user = result.rows[0];

  // New rows are always hashed. Legacy rows may still be plaintext -> verify and
  // upgrade in place so existing accounts keep working.
  let valid;
  if (isBcryptHash(user.password)) {
    valid = await verifyPassword(password, user.password);
  } else {
    valid = user.password === password;
  }

  if (!valid) {
    return { user: null };
  }

  if (!isBcryptHash(user.password)) {
    const hashedPassword = await hashPassword(password);
    await pool.query('UPDATE "Users" SET password = $1 WHERE username = $2', [hashedPassword, username]);
    user.password = hashedPassword;
  }

  return { user };
}

// Signup route
router.post('/signup', async (req, res) => {
  const { username, name, email, birthDate, password } = req.body;

  if (!username || !name || !email || !birthDate || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  try {
    const success = await signup(username, name, email, birthDate, password);
    if (!success) {
      return res.status(409).json({ error: 'Username or Email already exists' });
    }

    // Send a transactional welcome email. Non-blocking: a mail failure must not
    // fail the registration itself.
    const user = { username, name, email, birthDate };
    sendWelcomeEmail(user).catch((err) => {
      console.error('⚠️ Welcome email failed after signup:', err.message);
    });

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Signup route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Signin route
router.post('/signin', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const { user } = await signin(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = issueToken(user);
    return res.status(200).json({ message: 'Sign-in successful', user, token });
  } catch (err) {
    console.error('Signin route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
