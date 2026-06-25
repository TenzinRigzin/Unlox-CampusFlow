require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = (process.env.JWT_SECRET || 'super_secret_jwt_key_campusflow').trim().replace(/"/g, '');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/"/g, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/"/g, '');
const supabase = createClient(supabaseUrl, supabaseKey);

const PASSWORDS_FILE = path.join(__dirname, 'passwords.json');

// Helper to hash password using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper to load passwords from local JSON store
function loadPasswords() {
  if (!fs.existsSync(PASSWORDS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

// Helper to save passwords to local JSON store
function savePasswords(passwords) {
  fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2), 'utf8');
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register endpoint
app.post('/auth/register', async (req, res) => {
  try {
    const { name, branch, year, subjects, phone, email, password } = req.body;

    if (!name || !branch || !year || !subjects || !phone || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const passwords = loadPasswords();
    if (passwords[email]) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Insert student details into Supabase
    const { data, error: insertError } = await supabase
      .from('students')
      .insert({
        name,
        branch,
        year: Number(year),
        subjects,
        phone,
        email
      })
      .select();

    if (insertError) {
      console.error('Registration Insert Error:', insertError);
      return res.status(400).json({ error: insertError.message });
    }

    const newStudent = data && data[0];
    if (!newStudent) {
      return res.status(500).json({ error: 'Failed to create student record' });
    }

    // Save hashed password associated with the email
    passwords[email] = {
      hash: hashPassword(password),
      id: newStudent.id
    };
    savePasswords(passwords);

    return res.status(201).json({
      message: 'Registered successfully',
      userId: newStudent.id
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwords = loadPasswords();
    const userRecord = passwords[email];

    if (!userRecord || userRecord.hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch user details from Supabase using the ID
    const { data, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .eq('id', userRecord.id);

    if (fetchError) {
      console.error('Login Fetch Error:', fetchError);
      return res.status(400).json({ error: fetchError.message });
    }

    const student = data && data[0];
    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: student.id, email: student.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      token,
      user: student
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Mount AI router
const aiRouter = require('./routes/ai.js').default;
app.use('/ai', aiRouter);
// Mount Tasks router
const tasksRouter = require('./routes/tasks.js');
app.use('/tasks', tasksRouter);

// Mount Automations router
const automationsRouter = require('./routes/automations.js');
app.use('/automations', automationsRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});