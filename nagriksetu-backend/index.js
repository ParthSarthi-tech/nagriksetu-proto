import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pkg from 'pg'; 
import 'dotenv/config'; 

const { Pool } = pkg;
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// Generate a token from the admin password (no extra packages needed)
function makeToken(password) {
  return Buffer.from(password + ':nagriksetu-admin-v1').toString('base64');
}

// Middleware to protect admin routes
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const expected = makeToken(process.env.ADMIN_PASSWORD || 'admin123');
  if (token !== expected) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// POST: Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = makeToken(adminPassword);
  res.json({ token });
});

// POST: Report with Re-report Counter Logic
app.post('/api/report', upload.single('image'), async (req, res) => {
  try {
    const { category, description, lat, lng, isReopen } = req.body;
    const img = req.file ? req.file.filename : null;
    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);

    // De-duplication: Only check active (non-resolved) reports
    const check = await pool.query(
        `SELECT id, lat, lng FROM civic_tickets WHERE category = $1 AND status != 'Resolved'`, 
        [category]
    );
    const duplicate = check.rows.find(r => getDistance(nLat, nLng, r.lat, r.lng) < 50);

    if (duplicate) {
        if (img) fs.unlinkSync(path.join(uploadDir, img));
        return res.status(409).json({ message: "Duplicate", duplicateId: duplicate.id });
    }

    const reopenVal = isReopen === 'true' ? 1 : 0;

    const result = await pool.query(
      `INSERT INTO civic_tickets (category, description, lat, lng, image_path, reopen_count) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [category, description, nLat, nLng, img, reopenVal]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports', async (req, res) => {
  const result = await pool.query('SELECT * FROM civic_tickets ORDER BY reopen_count DESC, upvotes DESC');
  res.json(result.rows);
});

app.post('/api/report/:id/vote', async (req, res) => {
  await pool.query('UPDATE civic_tickets SET upvotes = upvotes + 1 WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// PROTECTED: Only admins can change status
app.post('/api/report/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE civic_tickets SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ success: true });
});

app.listen(process.env.PORT || 5000, () => console.log(`🚀 Server on port ${process.env.PORT || 5000}`));
