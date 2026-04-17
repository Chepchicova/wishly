const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db } = require('./db');

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };
const uploadsDirectoryPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDirectoryPath)) {
  fs.mkdirSync(uploadsDirectoryPath, { recursive: true });
}

function sendJson(response, statusCode, bodyObject) {
  response.writeHead(statusCode, jsonHeaders);
  response.end(JSON.stringify(bodyObject));
}

function logServerError(scope, error, details = {}) {
  console.error(`[${scope}]`, {
    message: error.message,
    code: error.code,
    errno: error.errno,
    sqlState: error.sqlState,
    sqlMessage: error.sqlMessage,
    details,
  });
}

function normalizePathname(pathname) {
  const pathnameWithoutTrailingSlash = pathname.replace(/\/$/, '');
  if (pathnameWithoutTrailingSlash === '') {
    return '/';
  }
  return pathnameWithoutTrailingSlash;
}

function createSimplePasswordHash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function isEmailFormatValid(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

function saveProfilePhotoFromDataUrl(idUser, photoDataUrl) {
  const dataUrlMatch = photoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!dataUrlMatch) {
    throw new Error('Неверный формат фото');
  }

  const mimeType = dataUrlMatch[1];
  const base64Data = dataUrlMatch[2];

  const extensionByMimeType = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
  };

  const fileExtension = extensionByMimeType[mimeType];
  if (!fileExtension) {
    throw new Error('Неподдерживаемый формат фото');
  }

  const fileName = `user_${idUser}_${Date.now()}.${fileExtension}`;
  const absoluteFilePath = path.join(uploadsDirectoryPath, fileName);
  fs.writeFileSync(absoluteFilePath, Buffer.from(base64Data, 'base64'));

  return `/uploads/${fileName}`;
}

function createRandomUserId() {
  return Math.floor(10000000 + Math.random() * 90000000);
}

async function createUniqueUserId() {
  let tryNumber = 0;

  while (tryNumber < 20) {
    const randomUserId = createRandomUserId();
    const [rows] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [randomUserId]);
    if (rows.length === 0) {
      return randomUserId;
    }
    tryNumber += 1;
  }

  throw new Error('Не удалось создать уникальный id_user');
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    request.on('data', (chunk) => {
      rawBody += chunk.toString();
    });

    request.on('end', () => {
      resolve(rawBody);
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

async function readJsonBody(request) {
  const rawBody = await readRequestBody(request);
  if (!rawBody) {
    return {};
  }
  return JSON.parse(rawBody);
}

async function handleRegister(request, response) {
  let requestBody = {};

  try {
    requestBody = await readJsonBody(request);
    const { name, email, password, birthday, passwordRepeat } = requestBody;

    if (!name || !email || !password || !passwordRepeat) {
      sendJson(response, 400, { success: false, error: 'Заполните обязательные поля' });
      return;
    }

    if (!isEmailFormatValid(email)) {
      sendJson(response, 400, { success: false, error: 'Введите корректный email' });
      return;
    }

    if (password.length < 6) {
      sendJson(response, 400, { success: false, error: 'Пароль должен содержать минимум 6 символов' });
      return;
    }

    if (password !== passwordRepeat) {
      sendJson(response, 400, { success: false, error: 'Пароли не совпадают' });
      return;
    }

    const [usersWithSameEmail] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (usersWithSameEmail.length > 0) {
      sendJson(response, 409, { success: false, error: 'Email уже зарегистрирован' });
      return;
    }

    const uniqueUserId = await createUniqueUserId();
    const passwordHash = createSimplePasswordHash(password);

    await db.query(
      `
      INSERT INTO users (name, id_user, email, password_hash, birthday, avatar)
      VALUES (?, ?, ?, ?, ?, NULL)
      `,
      [name, uniqueUserId, email, passwordHash, birthday || null]
    );

    console.log(`REGISTER OK: ${email}, id_user=${uniqueUserId}`);
    sendJson(response, 201, {
      success: true,
      user: {
        name,
        email,
        id_user: uniqueUserId,
        birthday: birthday || null,
      },
    });
  } catch (error) {
    logServerError('REGISTER ERROR', error, {
      name: requestBody.name,
      email: requestBody.email,
      birthday: requestBody.birthday || null,
    });

    if (error.code === 'ER_DUP_ENTRY') {
      sendJson(response, 409, {
        success: false,
        error: 'Дубликат уникального поля (email/id_user)',
        technical: error.sqlMessage || error.message,
      });
      return;
    }

    sendJson(response, 500, {
      success: false,
      error: 'Не удалось зарегистрировать пользователя',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleLogin(request, response) {
  let requestBody = {};

  try {
    requestBody = await readJsonBody(request);
    const { name, email, password } = requestBody;

    if (!name || !email || !password) {
      sendJson(response, 400, { success: false, error: 'Заполните обязательные поля' });
      return;
    }

    if (!isEmailFormatValid(email)) {
      sendJson(response, 400, { success: false, error: 'Введите корректный email' });
      return;
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        id_user,
        email,
        password_hash,
        DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
        avatar
      FROM users
      WHERE name = ? AND email = ?
      LIMIT 1
      `,
      [name, email]
    );

    if (rows.length === 0) {
      sendJson(response, 401, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const user = rows[0];
    const passwordHash = createSimplePasswordHash(password);

    if (user.password_hash !== passwordHash) {
      sendJson(response, 401, { success: false, error: 'Неверный пароль' });
      return;
    }

    console.log(`LOGIN OK: ${email}, id_user=${user.id_user}`);
    sendJson(response, 200, {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        id_user: user.id_user,
        birthday: user.birthday,
      },
    });
  } catch (error) {
    logServerError('LOGIN ERROR', error, {
      name: requestBody.name,
      email: requestBody.email,
    });

    sendJson(response, 500, {
      success: false,
      error: 'Не удалось выполнить вход',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleGetProfile(response, idUser) {
  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        id_user,
        email,
        DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
        description_user,
        avatar
      FROM users
      WHERE id_user = ?
      LIMIT 1
      `,
      [idUser]
    );

    if (rows.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const user = rows[0];
    const photoUrl = user.avatar || null;

    sendJson(response, 200, {
      success: true,
      profile: {
        id: user.id,
        id_user: user.id_user,
        name: user.name,
        email: user.email,
        birthday: user.birthday,
        description_user: user.description_user || '',
        avatar: photoUrl,
        photo_url: photoUrl,
      },
    });
  } catch (error) {
    logServerError('GET PROFILE ERROR', error, { idUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось получить профиль',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleUpdateProfile(request, response, idUser) {
  let requestBody = {};

  try {
    requestBody = await readJsonBody(request);
    const { name, birthday, descriptionUser, photoDataUrl } = requestBody;

    if (!name) {
      sendJson(response, 400, { success: false, error: 'Имя обязательно' });
      return;
    }

    let avatarPath = null;
    if (photoDataUrl) {
      avatarPath = saveProfilePhotoFromDataUrl(idUser, photoDataUrl);
    }

    if (avatarPath) {
      await db.query(
        `
        UPDATE users
        SET name = ?, birthday = ?, description_user = ?, avatar = ?
        WHERE id_user = ?
        `,
        [name, birthday || null, descriptionUser || null, avatarPath, idUser]
      );
    } else {
      await db.query(
        `
        UPDATE users
        SET name = ?, birthday = ?, description_user = ?
        WHERE id_user = ?
        `,
        [name, birthday || null, descriptionUser || null, idUser]
      );
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        id_user,
        email,
        DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
        description_user,
        avatar
      FROM users
      WHERE id_user = ?
      LIMIT 1
      `,
      [idUser]
    );

    if (rows.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const user = rows[0];
    const photoUrl = user.avatar || null;
    sendJson(response, 200, {
      success: true,
      profile: {
        id: user.id,
        id_user: user.id_user,
        name: user.name,
        email: user.email,
        birthday: user.birthday,
        description_user: user.description_user || '',
        avatar: photoUrl,
        photo_url: photoUrl,
      },
    });
  } catch (error) {
    logServerError('UPDATE PROFILE ERROR', error, {
      idUser,
      name: requestBody.name,
      birthday: requestBody.birthday || null,
    });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось сохранить профиль',
      technical: error.sqlMessage || error.message,
    });
  }
}

const WISHLIST_ICON_VALUES = [
  'basic',
  'birthday',
  'newyear',
  'valentine',
  'wedding',
  'party',
  'gift',
  'balloon',
  'heart',
  'star',
  'halloween',
  'carnival',
  'book',
  'art',
  'sport',
  'travel',
  'music',
  'home',
  'work',
  'game',
  'study',
];

const WISHLIST_STATUS_VALUES = ['private', 'shared', 'public'];

function makeBaseSlugFromTitle(title) {
  let slug = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9а-яёії-]+/gi, '');
  if (slug.length > 180) {
    slug = slug.slice(0, 180).replace(/-+$/g, '');
  }
  return slug || 'wishlist';
}

async function ensureUniqueWishlistSlug(ownerId, baseSlug) {
  const safeBase = baseSlug.slice(0, 200);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? safeBase : `${safeBase}-${attempt}`.slice(0, 200);
    const [rows] = await db.query(
      'SELECT id FROM wishlists WHERE owner_id = ? AND slug = ? LIMIT 1',
      [ownerId, candidate]
    );
    if (rows.length === 0) {
      return candidate;
    }
  }
  return `${safeBase.slice(0, 160)}-${Date.now()}`.slice(0, 200);
}

async function handleCreateWishlist(request, response, idUser) {
  let requestBody = {};
  try {
    requestBody = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const title = typeof requestBody.title === 'string' ? requestBody.title.trim() : '';
  if (!title) {
    sendJson(response, 400, { success: false, error: 'Укажите название вишлиста' });
    return;
  }
  if (title.length > 200) {
    sendJson(response, 400, { success: false, error: 'Название слишком длинное' });
    return;
  }

  const description = typeof requestBody.description === 'string' ? requestBody.description.trim() : '';
  let dateEvent = null;
  if (requestBody.dateEvent != null && String(requestBody.dateEvent).trim() !== '') {
    const rawDate = String(requestBody.dateEvent).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      sendJson(response, 400, { success: false, error: 'Некорректная дата события' });
      return;
    }
    dateEvent = rawDate;
  }

  const rawIcon = typeof requestBody.icon === 'string' ? requestBody.icon.trim().toLowerCase() : 'basic';
  const icon = WISHLIST_ICON_VALUES.includes(rawIcon) ? rawIcon : 'basic';

  const rawStatus = typeof requestBody.status === 'string' ? requestBody.status.trim().toLowerCase() : 'private';
  const status = WISHLIST_STATUS_VALUES.includes(rawStatus) ? rawStatus : 'private';

  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const ownerId = users[0].id;
    const baseSlug = makeBaseSlugFromTitle(title);
    const slug = await ensureUniqueWishlistSlug(ownerId, baseSlug);

    const [result] = await db.query(
      `
      INSERT INTO wishlists (
        owner_id,
        title_wishlist,
        description_wishlist,
        slug,
        date_event,
        icon,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [ownerId, title, description || null, slug, dateEvent, icon, status]
    );

    sendJson(response, 201, {
      success: true,
      wishlist: {
        id: String(result.insertId),
        slug,
      },
    });
  } catch (error) {
    logServerError('CREATE WISHLIST ERROR', error, { idUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось создать вишлист',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleGetWishlists(response, idUser) {
  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const [rows] = await db.query(
      `
      SELECT
        w.id AS wishlist_id,
        w.title_wishlist,
        w.description_wishlist,
        w.icon,
        DATE_FORMAT(w.date_event, '%Y-%m-%d') AS date_event,
        g.id AS gift_id,
        g.title_gift,
        g.description_gift
      FROM wishlists AS w
      INNER JOIN users AS u ON u.id = w.owner_id
      LEFT JOIN gifts AS g ON g.wishlist_id = w.id
      WHERE u.id_user = ?
      ORDER BY w.created_at DESC, g.created_at ASC
      `,
      [idUser]
    );

    const wishlistsById = new Map();
    for (const row of rows) {
      if (!wishlistsById.has(row.wishlist_id)) {
        wishlistsById.set(row.wishlist_id, {
          id: String(row.wishlist_id),
          title: row.title_wishlist,
          description: row.description_wishlist || '',
          icon: row.icon || 'basic',
          eventDate: row.date_event || '',
          wishes: [],
        });
      }

      if (row.gift_id) {
        wishlistsById.get(row.wishlist_id).wishes.push({
          id: `gift_${row.gift_id}`,
          title: row.title_gift,
          note: row.description_gift || '',
        });
      }
    }

    sendJson(response, 200, {
      success: true,
      wishlists: Array.from(wishlistsById.values()),
    });
  } catch (error) {
    logServerError('GET WISHLISTS ERROR', error, { idUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось получить вишлисты',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function dispatch(request, response) {
  const requestUrl = new URL(request.url, 'http://127.0.0.1');
  const normalizedPathname = normalizePathname(requestUrl.pathname);
  const profileRouteMatch = normalizedPathname.match(/^\/api\/profile\/(\d{8})$/);
  const wishlistsRouteMatch = normalizedPathname.match(/^\/api\/wishlists\/(\d{8})$/);

  if (request.method === 'GET' && (normalizedPathname === '/' || normalizedPathname === '/api')) {
    sendJson(response, 200, {
      success: true,
      message: 'WISHLY API',
    });
    return;
  }

  if (request.method === 'POST' && normalizedPathname === '/api/auth/register') {
    await handleRegister(request, response);
    return;
  }

  if (request.method === 'POST' && normalizedPathname === '/api/auth/login') {
    await handleLogin(request, response);
    return;
  }

  if (profileRouteMatch && request.method === 'GET') {
    await handleGetProfile(response, Number(profileRouteMatch[1]));
    return;
  }

  if (profileRouteMatch && request.method === 'PUT') {
    await handleUpdateProfile(request, response, Number(profileRouteMatch[1]));
    return;
  }

  if (wishlistsRouteMatch && request.method === 'GET') {
    await handleGetWishlists(response, Number(wishlistsRouteMatch[1]));
    return;
  }

  if (wishlistsRouteMatch && request.method === 'POST') {
    await handleCreateWishlist(request, response, Number(wishlistsRouteMatch[1]));
    return;
  }

  sendJson(response, 404, { success: false, error: 'Not found' });
}

module.exports = { dispatch, sendJson };
