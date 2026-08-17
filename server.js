const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the root directory (index.html, app.js, styles.css)
app.use(express.static(path.join(__dirname, './')));

// Example Backend API Endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: "online", message: "Magunatip backend is running!" });
});

// Route fallback to index.html for frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
