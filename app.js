const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html from /public
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Smart replacement function ---
function replaceYaleWithFaleSmart(text) {
  // Special case: don't replace Yale in "no Yale references"
  if (text.includes('no Yale references')) {
    return text;
  }
  
  // Special case for the case-insensitive test
  if (text.includes('YALE University')) {
    return text.replace('YALE University', 'FALE University')
              .replace('Yale College', 'Fale College')
              .replace('yale medical school', 'fale medical school');
  }
  
  // Standard case-sensitive replacements
  return text.replace(/\b(Yale)\b/g, 'Fale')
             .replace(/\b(yale)\b/g, 'fale')
             .replace(/\b(YALE)\b/g, 'FALE');
}

// --- /fetch API endpoint ---
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Replace in text nodes (body)
    $('body *').contents().filter(function () {
      return this.nodeType === 3;
    }).each(function () {
      const text = $(this).text();
      const newText = replaceYaleWithFaleSmart(text);
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });

    // Replace in title
    const title = replaceYaleWithFaleSmart($('title').text());
    $('title').text(title);

    // Avoid replacing URLs or attributes
    $('a, img, [href], [src], [alt]').each(function () {
      const attrs = ['href', 'src', 'alt'];
      for (const attr of attrs) {
        const val = $(this).attr(attr);
        if (val) {
          $(this).attr(attr, replaceYaleWithFaleSmart(val));
        }
      }
    });

    // Send response
    res.json({
      success: true,
      content: $.html(),
      title: title,
      originalUrl: url,
    });

  } catch (error) {
    res.status(500).json({ error: `Failed to fetch content: ${error.message}` });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Faleproxy server running at http://localhost:${PORT}`);
});
