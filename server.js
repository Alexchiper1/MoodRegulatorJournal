// server.js - Express API + static frontend
const express = require('express');
const path = require('path');
const Sentiment = require('sentiment');
const { insertEntry, getEntries } = require('./db');

const app = express();
const sentiment = new Sentiment();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true, service: 'moodmate' }));

// Create a new journal entry with sentiment analysis
app.post('/api/entries', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    const analysis = sentiment.analyze(text);
    // sentiment score typically ranges: negative < 0, positive > 0
    const score = analysis.score;

    // Map score → mood label + emoji (presentation handled on frontend too)
    let mood = 'Neutral';
    if (score >= 2) mood = 'Positive';
    else if (score <= -2) mood = 'Negative';

    const createdAt = new Date().toISOString();
    const saved = await insertEntry({ text: text.trim(), score, mood, createdAt });
    return res.status(201).json(saved);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error creating entry.' });
  }
});

// List recent entries (default 30)
app.get('/api/entries', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 200);
    const rows = await getEntries({ limit });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error fetching entries.' });
  }
});

// Fallback to index.html for root
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MoodMate running at http://localhost:${PORT}`);
});
