import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import multer from 'multer';
import 'dotenv/config';

const { Pool } = pkg;
const app = express();

// Initialize Multer to handle image uploads in memory
// This prevents the "empty body" issue when sending files from mobile
const upload = multer();

// --- Middleware ---
// Configured to allow your mobile phone to bypass browser security
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// --- Database Connection ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// --- ROUTES ---

/**
 * 1. Report an Issue
 * Receives data from mobile, checks for duplicates within 10 meters,
 * and saves to PostGIS.
 */
app.post('/api/report', upload.single('image'), async (req, res) => {
    // LOGGING: See exactly what the phone sent
    console.log("-----------------------------------------");
    console.log("📥 NEW REQUEST RECEIVED");
    console.log("Body Data:", req.body);
    
    if (req.file) {
        console.log("📸 Image Attached:", req.file.originalname, `(${req.file.size} bytes)`);
    } else {
        console.log("⚠️ No image received.");
    }

    const { category, description, lat, lng } = req.body;

    // Validation
    if (!category || !lat || !lng) {
        console.log("❌ REJECTED: Missing fields (lat, lng, or category)");
        return res.status(400).json({ error: "Missing required fields: category, lat, or lng" });
    }

    try {
        // Step A: Spatial De-duplication (Check 10m radius)
        const duplicateCheck = await pool.query(
            `SELECT id FROM civic_tickets 
             WHERE category = $1 
             AND ST_DWithin(
                location::geography, 
                ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 
                10
             ) 
             LIMIT 1`,
            [category, lng, lat]
        );

        if (duplicateCheck.rows.length > 0) {
            console.log("🔄 DUPLICATE: Incrementing report count for ID:", duplicateCheck.rows[0].id);
            const ticketId = duplicateCheck.rows[0].id;
            const updated = await pool.query(
                'UPDATE civic_tickets SET report_count = report_count + 1 WHERE id = $1 RETURNING id, report_count',
                [ticketId]
            );
            return res.status(200).json({ 
                message: 'Duplicate found. Increased report count.', 
                ticket: updated.rows[0] 
            });
        }

        // Step B: Create New Ticket
        console.log("🆕 CREATING NEW TICKET...");
        const newTicket = await pool.query( 
            `INSERT INTO civic_tickets (category, description, location) 
             VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)) 
             RETURNING id, category, status, report_count`,
            [category, description || 'Mobile Report', lng, lat]
        );

        console.log("✅ SUCCESS: Ticket created with ID:", newTicket.rows[0].id);
        res.status(201).json(newTicket.rows[0]);

    } catch (err) {
        console.error('🔥 DATABASE ERROR:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * 2. Get All Tickets
 * Used by the map to display markers.
 */
app.get('/api/tickets', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, category, description, status, report_count, 
             ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat 
             FROM civic_tickets`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching tickets:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
// We listen on '0.0.0.0' so it's accessible to other devices on the Wi-Fi
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 NagrikSetu Backend is LIVE!
    -----------------------------------------
    Local:   http://localhost:${PORT}
    Network: http://10.241.58.226:${PORT}
    -----------------------------------------
    Listening for mobile reports...
    `);
});