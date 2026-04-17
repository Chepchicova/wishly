const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { db } = require('./db');
const { dispatch, sendJson } = require('./routes');

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypeByExtension = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  const contentType = contentTypeByExtension[extension] || 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  setCorsHeaders(response);
  const requestUrl = new URL(request.url, 'http://127.0.0.1');

  if (request.method === 'OPTIONS') {
    response.writeHead(200);
    response.end();
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname.startsWith('/uploads/')) {
    const fileName = path.basename(requestUrl.pathname);
    const filePath = path.join(__dirname, 'uploads', fileName);

    if (!fs.existsSync(filePath)) {
      sendJson(response, 404, { success: false, error: 'Файл не найден' });
      return;
    }

    sendFile(response, filePath);
    return;
  }

  dispatch(request, response).catch((error) => {
    console.error('[UNHANDLED DISPATCH ERROR]', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      method: request.method,
      url: request.url,
    });
    sendJson(response, 500, {
      success: false,
      error: 'Внутренняя ошибка сервера',
      technical: error.sqlMessage || error.message,
    });
  });
});

async function checkDatabaseConnection() {
  try {
    await db.query('SELECT 1');
    console.log('DB CONNECTED: подключение к базе успешно');
  } catch (error) {
    console.error('DB NOT CONNECTED:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    });
  }
}

checkDatabaseConnection();

server.listen(config.port, () => {
  console.log(`API: http://localhost:${config.port}`);
});
