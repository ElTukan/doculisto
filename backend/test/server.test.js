import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server.js';
import { hasValidFileSignature } from '../../security.js';

function startTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function stopTestServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function postMultipart(port, blob, filename) {
  const form = new FormData();
  form.append('document', blob, filename);
  return fetch('http://127.0.0.1:' + port + '/api/analyze', {
    method: 'POST',
    body: form
  });
}

test('health endpoint reports the API as alive', async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const response = await fetch('http://127.0.0.1:' + port + '/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, service: 'doculisto-api' });
  } finally {
    await stopTestServer(server);
  }
});

test('analyze endpoint rejects requests without a document', async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const response = await fetch('http://127.0.0.1:' + port + '/api/analyze', { method: 'POST' });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Debes subir/);
  } finally {
    await stopTestServer(server);
  }
});

test('analyze endpoint rejects unsupported file types', async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const response = await postMultipart(
      port,
      new Blob(['esto no es un documento compatible'], { type: 'text/plain' }),
      'prueba.txt'
    );
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Formato no válido/);
  } finally {
    await stopTestServer(server);
  }
});

test('file signature validation rejects mismatched PDF content', () => {
  assert.equal(
    hasValidFileSignature({
      mimetype: 'application/pdf',
      buffer: Buffer.from('not-a-pdf')
    }),
    false
  );
});

test('analyze endpoint rejects files above the 10 MB limit', async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const oversized = new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'application/pdf' });
    const response = await postMultipart(port, oversized, 'grande.pdf');
    assert.equal(response.status, 413);
    assert.match((await response.json()).error, /10 MB/);
  } finally {
    await stopTestServer(server);
  }
});
