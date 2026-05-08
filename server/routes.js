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

function saveGiftImageFromDataUrl(idUser, photoDataUrl) {
  const dataUrlMatch = photoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!dataUrlMatch) {
    throw new Error('Неверный формат изображения подарка');
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
    throw new Error('Неподдерживаемый формат изображения');
  }

  const fileName = `gift_user_${idUser}_${Date.now()}.${fileExtension}`;
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

async function handleCreateWishlist(request, response, idUser) {
  let requestBody = {};
  try {
    requestBody = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const parsed = parseWishlistBodyForWrite(requestBody);
  if (parsed.error) {
    sendJson(response, 400, { success: false, error: parsed.error });
    return;
  }

  const { title, description, dateEvent, icon, status } = parsed;

  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const ownerId = users[0].id;

    const [result] = await db.query(
      `
      INSERT INTO wishlists (
        owner_id,
        title_wishlist,
        description_wishlist,
        date_event,
        icon,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [ownerId, title, description || null, dateEvent, icon, status]
    );

    sendJson(response, 201, {
      success: true,
      wishlist: {
        id: String(result.insertId),
      },
    });
  } catch (error) {
    logServerError('CREATE WISHLIST ERROR', error, { idUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось создать список желаний',
      technical: error.sqlMessage || error.message,
    });
  }
}

function parseWishlistBodyForWrite(requestBody) {
  const title = typeof requestBody.title === 'string' ? requestBody.title.trim() : '';
  if (!title) {
    return { error: 'Укажите название списка желаний' };
  }
  if (title.length > 200) {
    return { error: 'Название слишком длинное' };
  }

  const description = typeof requestBody.description === 'string' ? requestBody.description.trim() : '';
  let dateEvent = null;
  if (requestBody.dateEvent != null && String(requestBody.dateEvent).trim() !== '') {
    const rawDate = String(requestBody.dateEvent).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return { error: 'Некорректная дата события' };
    }
    dateEvent = rawDate;
  }

  const rawIcon = typeof requestBody.icon === 'string' ? requestBody.icon.trim().toLowerCase() : 'basic';
  const icon = WISHLIST_ICON_VALUES.includes(rawIcon) ? rawIcon : 'basic';

  const rawStatus = typeof requestBody.status === 'string' ? requestBody.status.trim().toLowerCase() : 'private';
  const status = WISHLIST_STATUS_VALUES.includes(rawStatus) ? rawStatus : 'private';

  return { title, description, dateEvent, icon, status };
}

async function handleUpdateWishlist(request, response, idUser, wishlistIdRaw) {
  const wishlistId = String(wishlistIdRaw || '').trim();
  if (!/^\d+$/.test(wishlistId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор списка желаний' });
    return;
  }

  let requestBody = {};
  try {
    requestBody = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const parsed = parseWishlistBodyForWrite(requestBody);
  if (parsed.error) {
    sendJson(response, 400, { success: false, error: parsed.error });
    return;
  }

  const { title, description, dateEvent, icon, status } = parsed;

  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const ownerId = users[0].id;
    const [existing] = await db.query(
      'SELECT wishlist_id FROM wishlists WHERE wishlist_id = ? AND owner_id = ? LIMIT 1',
      [wishlistId, ownerId]
    );
    if (existing.length === 0) {
      sendJson(response, 404, { success: false, error: 'Список желаний не найден' });
      return;
    }

    await db.query(
      `
      UPDATE wishlists
      SET
        title_wishlist = ?,
        description_wishlist = ?,
        date_event = ?,
        icon = ?,
        status = ?
      WHERE wishlist_id = ? AND owner_id = ?
      `,
      [title, description || null, dateEvent, icon, status, wishlistId, ownerId]
    );

    sendJson(response, 200, {
      success: true,
      wishlist: { id: wishlistId },
    });
  } catch (error) {
    logServerError('UPDATE WISHLIST ERROR', error, { idUser, wishlistId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось сохранить список желаний',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleDeleteWishlist(response, idUser, wishlistIdRaw) {
  const wishlistId = String(wishlistIdRaw || '').trim();
  if (!/^\d+$/.test(wishlistId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор списка желаний' });
    return;
  }

  let connection;
  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const ownerId = users[0].id;
    const [rows] = await db.query(
      'SELECT wishlist_id FROM wishlists WHERE wishlist_id = ? AND owner_id = ? LIMIT 1',
      [wishlistId, ownerId]
    );

    if (rows.length === 0) {
      sendJson(response, 404, { success: false, error: 'Список желаний не найден' });
      return;
    }

    const [giftRows] = await db.query(
      'SELECT DISTINCT gift_id FROM gift_wishlists WHERE wishlist_id = ?',
      [wishlistId]
    );
    const giftIds = giftRows.map((r) => r.gift_id);

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [delWishlist] = await connection.query(
      'DELETE FROM wishlists WHERE wishlist_id = ? AND owner_id = ?',
      [wishlistId, ownerId]
    );

    if (!delWishlist.affectedRows) {
      await connection.rollback();
      sendJson(response, 404, { success: false, error: 'Список желаний не найден' });
      return;
    }

    /* Связи gift_wishlists удаляются каскадом при удалении списка желаний. Удаляем «осиротевшие» подарки,
       которые больше не привязаны ни к одному списку. */
    if (giftIds.length > 0) {
      const placeholders = giftIds.map(() => '?').join(',');
      await connection.query(
        `
        DELETE FROM gifts
        WHERE gift_id IN (${placeholders})
          AND NOT EXISTS (SELECT 1 FROM gift_wishlists gw WHERE gw.gift_id = gifts.gift_id)
        `,
        giftIds
      );
    }

    await connection.commit();
    sendJson(response, 200, { success: true });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    logServerError('DELETE WISHLIST ERROR', error, { idUser, wishlistId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось удалить список желаний',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

function parseCreateGiftBody(requestBody) {
  const title = typeof requestBody.title === 'string' ? requestBody.title.trim() : '';
  if (!title) {
    return { error: 'Укажите название подарка' };
  }
  if (title.length > 200) {
    return { error: 'Название подарка слишком длинное' };
  }

  const description =
    typeof requestBody.description === 'string' ? requestBody.description.trim() : '';

  let price = null;
  if (requestBody.price != null && String(requestBody.price).trim() !== '') {
    const n = Number(String(requestBody.price).replace(',', '.'));
    if (Number.isNaN(n) || n < 0) {
      return { error: 'Укажите корректную цену' };
    }
    price = n;
  }

  const urlRaw = typeof requestBody.url === 'string' ? requestBody.url.trim() : '';
  const url = urlRaw || null;

  const rawIds = requestBody.wishlistIds;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return { error: 'Выберите хотя бы один список желаний' };
  }

  const wishlistIdSet = new Set();
  for (const item of rawIds) {
    const sid = String(item ?? '').trim();
    if (!/^\d+$/.test(sid)) {
      return { error: 'Некорректный список желаний' };
    }
    wishlistIdSet.add(sid);
  }

  const wishlistIds = Array.from(wishlistIdSet);

  const imageDataUrl =
    typeof requestBody.imageDataUrl === 'string' && requestBody.imageDataUrl.trim()
      ? requestBody.imageDataUrl.trim()
      : null;

  return { title, description, price, url, wishlistIds, imageDataUrl };
}

async function handleCreateGift(request, response, idUser) {
  let requestBody = {};
  try {
    requestBody = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const parsed = parseCreateGiftBody(requestBody);
  if (parsed.error) {
    sendJson(response, 400, { success: false, error: parsed.error });
    return;
  }

  const { title, description, price, url, wishlistIds, imageDataUrl } = parsed;

  let connection;
  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const ownerId = users[0].id;
    const placeholders = wishlistIds.map(() => '?').join(',');
    const [ownedRows] = await db.query(
      `
      SELECT wishlist_id
      FROM wishlists
      WHERE owner_id = ? AND wishlist_id IN (${placeholders})
      `,
      [ownerId, ...wishlistIds.map((id) => Number(id))]
    );

    if (ownedRows.length !== wishlistIds.length) {
      sendJson(response, 403, {
        success: false,
        error: 'Можно добавлять подарки только в свои списки желаний',
      });
      return;
    }

    let imagePath = null;
    if (imageDataUrl) {
      imagePath = saveGiftImageFromDataUrl(idUser, imageDataUrl);
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [insertGift] = await connection.query(
      `
      INSERT INTO gifts (
        title_gift,
        description_gift,
        price,
        url,
        image_path,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'free')
      `,
      [title, description || null, price, url, imagePath]
    );

    const giftId = insertGift.insertId;

    for (const wlId of wishlistIds) {
      await connection.query(
        'INSERT INTO gift_wishlists (gift_id, wishlist_id) VALUES (?, ?)',
        [giftId, Number(wlId)]
      );
    }

    await connection.commit();

    sendJson(response, 201, {
      success: true,
      gift: { id: String(giftId) },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    if (error.message && error.message.includes('Неверный формат')) {
      sendJson(response, 400, { success: false, error: error.message });
      return;
    }
    logServerError('CREATE GIFT ERROR', error, { idUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось создать подарок',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function handleGetGiftDetails(response, idUser, giftIdRaw) {
  const giftId = String(giftIdRaw || '').trim();
  if (!/^\d+$/.test(giftId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор подарка' });
    return;
  }

  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    const ownerId = users[0].id;

    const [rows] = await db.query(
      `
      SELECT
        g.gift_id,
        g.title_gift,
        g.description_gift,
        g.price,
        g.url,
        g.image_path,
        g.status,
        w.wishlist_id,
        w.title_wishlist
      FROM gifts g
      INNER JOIN gift_wishlists gw ON gw.gift_id = g.gift_id
      INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
      WHERE g.gift_id = ? AND w.owner_id = ?
      ORDER BY w.created_at DESC
      `,
      [Number(giftId), ownerId]
    );

    if (rows.length === 0) {
      sendJson(response, 404, { success: false, error: 'Подарок не найден' });
      return;
    }

    const first = rows[0];
    sendJson(response, 200, {
      success: true,
      gift: {
        id: String(first.gift_id),
        title: first.title_gift,
        description: first.description_gift || '',
        price: first.price != null ? String(first.price) : '',
        url: first.url || '',
        imagePath: first.image_path || null,
        status: first.status || 'free',
        wishlistIds: rows.map((r) => String(r.wishlist_id)),
        wishlists: rows.map((r) => ({
          id: String(r.wishlist_id),
          title: r.title_wishlist,
        })),
      },
    });
  } catch (error) {
    logServerError('GET GIFT DETAILS ERROR', error, { idUser, giftId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось получить данные подарка',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleUpdateGift(request, response, idUser, giftIdRaw) {
  const giftId = String(giftIdRaw || '').trim();
  if (!/^\d+$/.test(giftId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор подарка' });
    return;
  }

  let requestBody = {};
  try {
    requestBody = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const parsed = parseCreateGiftBody(requestBody);
  if (parsed.error) {
    sendJson(response, 400, { success: false, error: parsed.error });
    return;
  }

  const { title, description, price, url, wishlistIds, imageDataUrl } = parsed;
  let connection;
  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    const ownerId = users[0].id;

    const [giftAccess] = await db.query(
      `
      SELECT g.gift_id
      FROM gifts g
      INNER JOIN gift_wishlists gw ON gw.gift_id = g.gift_id
      INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
      WHERE g.gift_id = ? AND w.owner_id = ?
      LIMIT 1
      `,
      [Number(giftId), ownerId]
    );
    if (!giftAccess.length) {
      sendJson(response, 404, { success: false, error: 'Подарок не найден' });
      return;
    }

    const placeholders = wishlistIds.map(() => '?').join(',');
    const [ownedRows] = await db.query(
      `
      SELECT wishlist_id
      FROM wishlists
      WHERE owner_id = ? AND wishlist_id IN (${placeholders})
      `,
      [ownerId, ...wishlistIds.map((id) => Number(id))]
    );
    if (ownedRows.length !== wishlistIds.length) {
      sendJson(response, 403, {
        success: false,
        error: 'Можно привязывать подарок только к своим спискам желаний',
      });
      return;
    }

    let imagePath = null;
    if (imageDataUrl) {
      imagePath = saveGiftImageFromDataUrl(idUser, imageDataUrl);
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    if (imagePath) {
      await connection.query(
        `
        UPDATE gifts
        SET title_gift = ?, description_gift = ?, price = ?, url = ?, image_path = ?
        WHERE gift_id = ?
        `,
        [title, description || null, price, url, imagePath, Number(giftId)]
      );
    } else {
      await connection.query(
        `
        UPDATE gifts
        SET title_gift = ?, description_gift = ?, price = ?, url = ?
        WHERE gift_id = ?
        `,
        [title, description || null, price, url, Number(giftId)]
      );
    }

    await connection.query(
      `
      DELETE gw FROM gift_wishlists gw
      INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
      WHERE gw.gift_id = ? AND w.owner_id = ?
      `,
      [Number(giftId), ownerId]
    );
    for (const wlId of wishlistIds) {
      await connection.query(
        'INSERT INTO gift_wishlists (gift_id, wishlist_id) VALUES (?, ?)',
        [Number(giftId), Number(wlId)]
      );
    }

    await connection.commit();
    sendJson(response, 200, { success: true, gift: { id: giftId } });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    logServerError('UPDATE GIFT ERROR', error, { idUser, giftId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось сохранить подарок',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function handleDeleteGift(requestUrl, response, idUser, giftIdRaw) {
  const giftId = String(giftIdRaw || '').trim();
  if (!/^\d+$/.test(giftId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор подарка' });
    return;
  }

  const scope = String(requestUrl.searchParams.get('scope') || 'all').trim().toLowerCase();
  const wishlistIdRaw = String(requestUrl.searchParams.get('wishlistId') || '').trim();

  let connection;
  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    const ownerId = users[0].id;

    const [giftLists] = await db.query(
      `
      SELECT w.wishlist_id
      FROM gift_wishlists gw
      INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
      WHERE gw.gift_id = ? AND w.owner_id = ?
      `,
      [Number(giftId), ownerId]
    );
    if (!giftLists.length) {
      sendJson(response, 404, { success: false, error: 'Подарок не найден' });
      return;
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    if (scope === 'wishlist') {
      if (!/^\d+$/.test(wishlistIdRaw)) {
        await connection.rollback();
        sendJson(response, 400, { success: false, error: 'Некорректный идентификатор списка желаний' });
        return;
      }
      const [delLink] = await connection.query(
        `
        DELETE gw FROM gift_wishlists gw
        INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
        WHERE gw.gift_id = ? AND gw.wishlist_id = ? AND w.owner_id = ?
        `,
        [Number(giftId), Number(wishlistIdRaw), ownerId]
      );
      if (!delLink.affectedRows) {
        await connection.rollback();
        sendJson(response, 404, { success: false, error: 'Связь подарка со списком не найдена' });
        return;
      }
    } else {
      await connection.query(
        `
        DELETE gw FROM gift_wishlists gw
        INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
        WHERE gw.gift_id = ? AND w.owner_id = ?
        `,
        [Number(giftId), ownerId]
      );
    }

    await connection.query(
      `
      DELETE FROM gifts
      WHERE gift_id = ?
        AND NOT EXISTS (SELECT 1 FROM gift_wishlists gw WHERE gw.gift_id = gifts.gift_id)
      `,
      [Number(giftId)]
    );

    await connection.commit();
    sendJson(response, 200, { success: true });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    logServerError('DELETE GIFT ERROR', error, { idUser, giftId, scope });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось удалить подарок',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
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
        w.wishlist_id,
        w.title_wishlist,
        w.description_wishlist,
        w.icon,
        DATE_FORMAT(w.date_event, '%Y-%m-%d') AS date_event,
        g.gift_id,
        g.title_gift,
        g.description_gift,
        g.image_path,
        g.price
      FROM wishlists AS w
      INNER JOIN users AS u ON u.id = w.owner_id
      LEFT JOIN gift_wishlists AS gw ON gw.wishlist_id = w.wishlist_id
      LEFT JOIN gifts AS g ON g.gift_id = gw.gift_id
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
          giftId: String(row.gift_id),
          title: row.title_gift,
          note: row.description_gift || '',
          imagePath: row.image_path || null,
          price: row.price != null ? row.price : null,
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
      error: 'Не удалось получить списки желаний',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function dispatch(request, response) {
  const requestUrl = new URL(request.url, 'http://127.0.0.1');
  const normalizedPathname = normalizePathname(requestUrl.pathname);
  const profileRouteMatch = normalizedPathname.match(/^\/api\/profile\/(\d{8})$/);
  const wishlistsRouteMatch = normalizedPathname.match(/^\/api\/wishlists\/(\d{8})$/);
  const wishlistItemRouteMatch = normalizedPathname.match(/^\/api\/wishlists\/(\d{8})\/(\d+)$/);
  const createGiftRouteMatch = normalizedPathname.match(/^\/api\/gifts\/(\d{8})$/);
  const giftItemRouteMatch = normalizedPathname.match(/^\/api\/gifts\/(\d{8})\/(\d+)$/);

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

  if (wishlistItemRouteMatch && request.method === 'PUT') {
    await handleUpdateWishlist(
      request,
      response,
      Number(wishlistItemRouteMatch[1]),
      wishlistItemRouteMatch[2]
    );
    return;
  }

  if (wishlistItemRouteMatch && request.method === 'DELETE') {
    await handleDeleteWishlist(
      response,
      Number(wishlistItemRouteMatch[1]),
      wishlistItemRouteMatch[2]
    );
    return;
  }

  if (createGiftRouteMatch && request.method === 'POST') {
    await handleCreateGift(request, response, Number(createGiftRouteMatch[1]));
    return;
  }

  if (giftItemRouteMatch && request.method === 'GET') {
    await handleGetGiftDetails(response, Number(giftItemRouteMatch[1]), giftItemRouteMatch[2]);
    return;
  }

  if (giftItemRouteMatch && request.method === 'PUT') {
    await handleUpdateGift(request, response, Number(giftItemRouteMatch[1]), giftItemRouteMatch[2]);
    return;
  }

  if (giftItemRouteMatch && request.method === 'DELETE') {
    await handleDeleteGift(requestUrl, response, Number(giftItemRouteMatch[1]), giftItemRouteMatch[2]);
    return;
  }

  sendJson(response, 404, { success: false, error: 'Not found' });
}

module.exports = { dispatch, sendJson };
