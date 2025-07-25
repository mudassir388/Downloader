const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "*"],
      connectSrc: ["'self'", "https://api.github.com", "https://arxiv.org"]
    }
  }
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route to get resources data
app.get('/api/resources', (req, res) => {
  const category = req.query.category;
  const search = req.query.search;
  
  // This would normally come from a database
  let resources = require('./data/resources.json');
  
  if (category && category !== 'all') {
    resources = resources.filter(resource => resource.category === category);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    resources = resources.filter(resource => 
      resource.title.toLowerCase().includes(searchLower) ||
      resource.description.toLowerCase().includes(searchLower) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }
  
  res.json(resources);
});

// API route to get statistics
app.get('/api/stats', (req, res) => {
  const resources = require('./data/resources.json');
  const categories = [...new Set(resources.map(r => r.category))];
  
  const stats = {
    totalResources: resources.length,
    totalCategories: categories.length,
    categoryCounts: categories.reduce((acc, category) => {
      acc[category] = resources.filter(r => r.category === category).length;
      return acc;
    }, {}),
    recentlyAdded: resources.filter(r => {
      const addedDate = new Date(r.dateAdded);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return addedDate > thirtyDaysAgo;
    }).length
  };
  
  res.json(stats);
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Awesome DL Hub server running on port ${PORT}`);
  console.log(`📊 Visit http://localhost:${PORT} to explore the deep learning resource hub`);
});