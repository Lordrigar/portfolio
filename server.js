const express = require('express');
const path = require('node:path');
const { existsSync } = require('node:fs');

const port = process.env.PORT || 3000;
const dist = path.join(__dirname, 'dist');

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('Missing production build. Run npm run build first.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(dist));
app.use((_req, res) => {
  res.status(404).type('text').send('Not found');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Portfolio listening on port ${port}`);
});
