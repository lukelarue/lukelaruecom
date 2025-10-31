import { createApp } from './app.js';
import { config } from './config.js';

const port = config.port;

const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on port ${port}`);
});
