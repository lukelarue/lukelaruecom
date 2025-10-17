import { config } from './config';
import { getFirestore } from './lib/firestore';
import { createApp } from './app';
import { MessageStore } from './services/messageStore';

const firestore = getFirestore();
const messageStore = new MessageStore({ firestore });
const app = createApp({ messageStore });

const port = config.port;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Chat API listening on port ${port}`);
});
