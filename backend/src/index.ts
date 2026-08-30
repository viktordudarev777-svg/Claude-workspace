import { config } from './config';
import { createApp } from './app';

const { app } = createApp(config);

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[foodlens] listening on http://localhost:${config.port} (${config.env})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
