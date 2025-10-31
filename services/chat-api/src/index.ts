import { createApp } from './app.js';
import { config } from './config.js';
import { getFirestore } from './lib/firestore.js';
import { MessageStore } from './services/messageStore.js';

const firestore = getFirestore();
const messageStore = new MessageStore({ firestore });
const app = createApp({ messageStore });

const port = config.port;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Chat API listening on port ${port}`);
});
