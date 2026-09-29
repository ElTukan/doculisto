import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server.js';

function startTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('health endpoint reports the API as alive', async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, service: 'doculisto-api' });
  } finally {
    server.close();
  }
});

test('analyze endpoint rejects requests without a document', async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/analyze`, { method: 'POST' });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Debes subir/);
  } finally {
    server.close();
  }
});
