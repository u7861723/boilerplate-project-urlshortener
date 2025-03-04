require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const urlParser = require('url');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Ensure required environment variables are set
if (!process.env.MONGO_URI) {
  console.error("Error: MONGO_URI is not defined in the environment variables.");
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB Connected Successfully!"))
.catch(err => {
  console.error("MongoDB Connection Error:", err);
  process.exit(1);
});

// Define URL Schema
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const URL = mongoose.model('URL', urlSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(`${process.cwd()}/public`));

// Serve Home Page
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Example API Endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Handle URL Shortening (POST /api/shorturl)
app.post('/api/shorturl', async (req, res) => {
  let { url } = req.body;
  let urlObject;
  
  // try {
  //   urlObject = new URL(url);
  // } catch (err) {
  //   return res.json({ error: "invalid url" });
  // }

  if (!/^https?:\/\//.test(url)) {
    return res.json({ error: "invalid url" });
  }
  
  // const hostname = urlObject.hostname;
  // dns.lookup(hostname, async (err) => {
  //   if (err) {
  //     return res.json({ error: "invalid url" });
  //   }
    
    let existingUrl = await URL.findOne({ original_url: url });
    if (existingUrl) {
      return res.json({ original_url: existingUrl.original_url, short_url: existingUrl.short_url });
    }
    
    let count = await URL.countDocuments();
    let newUrlEntry = new URL({ original_url: url, short_url: count + 1 });
    await newUrlEntry.save();
    
    res.json({ original_url: newUrlEntry.original_url, short_url: newUrlEntry.short_url });
  // });
});

// Handle Redirect (GET /api/shorturl/:shorturl)
app.get('/api/shorturl/:shorturl', async (req, res) => {
  const { shorturl } = req.params;
  if (isNaN(shorturl)) {
    return res.json({ error: "Invalid short URL format" });
  }
  const foundUrl = await URL.findOne({ short_url: Number(shorturl) });
  
  if (foundUrl) {
    return res.redirect(foundUrl.original_url);
  } else {
    return res.json({ error: "No short URL found for the given input" });
  }
});

// Start Server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
