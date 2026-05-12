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
const WISHLIST_PRIVACY_MODES = ['private', 'public', 'friends_all', 'friends_selected'];
const WISHLIST_RESERVATION_DISPLAY_VALUES = ['hidden', 'show_without_name', 'show_with_name'];

function normalizeReservationDisplay(raw) {
  if (raw && WISHLIST_RESERVATION_DISPLAY_VALUES.includes(String(raw))) {
    return String(raw);
  }
  return 'hidden';
}

function parseReservationDisplayFromBody(requestBody) {
  const raw =
    typeof requestBody.reservationDisplay === 'string'
      ? requestBody.reservationDisplay.trim()
      : typeof requestBody.reservation_display === 'string'
        ? requestBody.reservation_display.trim()
        : '';
  return normalizeReservationDisplay(raw || 'hidden');
}

function parseWishlistPrivacyFields(requestBody) {
  let privacyModeRaw =
    typeof requestBody.privacyMode === 'string' ? requestBody.privacyMode.trim().toLowerCase() : '';
  let privacyMode = WISHLIST_PRIVACY_MODES.includes(privacyModeRaw) ? privacyModeRaw : '';

  if (!privacyMode) {
    const legacy = typeof requestBody.status === 'string' ? requestBody.status.trim().toLowerCase() : 'private';
    if (legacy === 'public') {
      privacyMode = 'public';
    } else if (legacy === 'shared') {
      privacyMode = 'friends_all';
    } else {
      privacyMode = 'private';
    }
  }

  const allowedFriendIdUsers = [];
  if (Array.isArray(requestBody.allowedFriendIdUsers)) {
    const unique = new Set();
    for (const v of requestBody.allowedFriendIdUsers) {
      const n = Number(v);
      if (Number.isInteger(n) && n > 0) {
        unique.add(n);
      }
    }
    for (const id of unique) {
      allowedFriendIdUsers.push(id);
    }
  }

  if (privacyMode === 'friends_selected' && allowedFriendIdUsers.length === 0) {
    return { error: 'Выберите хотя бы одного друга, которому будет виден список' };
  }

  const trimmedAllowed =
    privacyMode === 'friends_selected' ? allowedFriendIdUsers : [];

  return { privacyMode, allowedFriendIdUsers: trimmedAllowed };
}

function wishlistPrivacyToStatus(privacyMode) {
  if (privacyMode === 'public') {
    return 'public';
  }
  if (privacyMode === 'private') {
    return 'private';
  }
  return 'shared';
}

async function resolveFriendInternalIdsForWishlistAccess(queryable, ownerInternalId, allowedFriendIdUsers) {
  if (!allowedFriendIdUsers.length) {
    return { friendInternalIds: [] };
  }
  const placeholders = allowedFriendIdUsers.map(() => '?').join(',');
  const [rows] = await queryable.query(
    `
    SELECT u.id
    FROM users u
    INNER JOIN friends f
      ON (f.user_id = ? AND f.friend_id = u.id)
      OR (f.friend_id = ? AND f.user_id = u.id)
    WHERE u.id_user IN (${placeholders})
    `,
    [ownerInternalId, ownerInternalId, ...allowedFriendIdUsers]
  );
  if (rows.length !== allowedFriendIdUsers.length) {
    return { error: 'Один или несколько пользователей не в списке ваших друзей' };
  }
  return { friendInternalIds: rows.map((r) => r.id) };
}

async function replaceWishlistAccessRows(queryable, wishlistId, friendInternalIds) {
  await queryable.query('DELETE FROM wishlist_access WHERE wishlist_id = ?', [Number(wishlistId)]);
  for (const friendId of friendInternalIds) {
    await queryable.query('INSERT INTO wishlist_access (wishlist_id, friend_id) VALUES (?, ?)', [
      Number(wishlistId),
      friendId,
    ]);
  }
}

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

  const { title, description, dateEvent, icon, privacyMode, allowedFriendIdUsers, reservationDisplay } = parsed;
  const status = wishlistPrivacyToStatus(privacyMode);

  let connection;
  try {
    const [users] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const ownerId = users[0].id;

    let friendInternalIds = [];
    if (privacyMode === 'friends_selected') {
      const resolved = await resolveFriendInternalIdsForWishlistAccess(db, ownerId, allowedFriendIdUsers);
      if (resolved.error) {
        sendJson(response, 400, { success: false, error: resolved.error });
        return;
      }
      friendInternalIds = resolved.friendInternalIds;
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `
      INSERT INTO wishlists (
        owner_id,
        title_wishlist,
        description_wishlist,
        date_event,
        icon,
        status,
        reservation_display
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [ownerId, title, description || null, dateEvent, icon, status, reservationDisplay]
    );

    const newWishlistId = result.insertId;
    if (status === 'shared' && friendInternalIds.length > 0) {
      await replaceWishlistAccessRows(connection, newWishlistId, friendInternalIds);
    } else {
      await connection.query('DELETE FROM wishlist_access WHERE wishlist_id = ?', [newWishlistId]);
    }

    await connection.commit();

    sendJson(response, 201, {
      success: true,
      wishlist: {
        id: String(newWishlistId),
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    logServerError('CREATE WISHLIST ERROR', error, { idUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось создать список желаний',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
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

  const privacyParsed = parseWishlistPrivacyFields(requestBody);
  if (privacyParsed.error) {
    return { error: privacyParsed.error };
  }

  const reservationDisplay = parseReservationDisplayFromBody(requestBody);

  return {
    title,
    description,
    dateEvent,
    icon,
    privacyMode: privacyParsed.privacyMode,
    allowedFriendIdUsers: privacyParsed.allowedFriendIdUsers,
    reservationDisplay,
  };
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

  const { title, description, dateEvent, icon, privacyMode, allowedFriendIdUsers, reservationDisplay } = parsed;
  const status = wishlistPrivacyToStatus(privacyMode);

  let connection;
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

    let friendInternalIds = [];
    if (privacyMode === 'friends_selected') {
      const resolved = await resolveFriendInternalIdsForWishlistAccess(db, ownerId, allowedFriendIdUsers);
      if (resolved.error) {
        sendJson(response, 400, { success: false, error: resolved.error });
        return;
      }
      friendInternalIds = resolved.friendInternalIds;
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE wishlists
      SET
        title_wishlist = ?,
        description_wishlist = ?,
        date_event = ?,
        icon = ?,
        status = ?,
        reservation_display = ?
      WHERE wishlist_id = ? AND owner_id = ?
      `,
      [title, description || null, dateEvent, icon, status, reservationDisplay, wishlistId, ownerId]
    );

    if (status === 'shared' && friendInternalIds.length > 0) {
      await replaceWishlistAccessRows(connection, wishlistId, friendInternalIds);
    } else {
      await connection.query('DELETE FROM wishlist_access WHERE wishlist_id = ?', [Number(wishlistId)]);
    }

    await connection.commit();

    sendJson(response, 200, {
      success: true,
      wishlist: { id: wishlistId },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    logServerError('UPDATE WISHLIST ERROR', error, { idUser, wishlistId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось сохранить список желаний',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
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

/** Подарок в списке друга, видимом зрителю (как в handleGetFriendWishlists). */
async function giftVisibleToFriendViewer(ownerInternalId, viewerInternalId, giftIdNum) {
  const [rows] = await db.query(
    `
    SELECT 1 AS ok
    FROM gift_wishlists gw
    INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
    WHERE gw.gift_id = ?
      AND w.owner_id = ?
      AND (
        w.status = 'public'
        OR (
          w.status = 'shared'
          AND (
            NOT EXISTS (SELECT 1 FROM wishlist_access wa0 WHERE wa0.wishlist_id = w.wishlist_id)
            OR EXISTS (
              SELECT 1 FROM wishlist_access wa1
              WHERE wa1.wishlist_id = w.wishlist_id AND wa1.friend_id = ?
            )
          )
        )
      )
    LIMIT 1
    `,
    [giftIdNum, ownerInternalId, viewerInternalId]
  );
  return rows.length > 0;
}

/** Подпись о брони для зрителя, который не владелец списка: без имени бронирующего */
function buildNonOwnerReservationLabel(giftStatus, hasReservationRow) {
  const st = giftStatus && typeof giftStatus === 'string' ? giftStatus : 'free';
  if (st === 'gifted') {
    return 'Исполнено';
  }
  if (hasReservationRow || st === 'reserved') {
    return 'Забронировано';
  }
  return null;
}

function buildGiftDetailReservationLabel(rows) {
  if (!rows.length || !rows[0].reservation_id) {
    return null;
  }
  let allowWithName = false;
  let allowWithoutName = false;
  for (const row of rows) {
    if (!row.reservation_id) {
      continue;
    }
    const rd = normalizeReservationDisplay(row.reservation_display);
    if (rd === 'show_with_name') {
      allowWithName = true;
    }
    if (rd === 'show_without_name') {
      allowWithoutName = true;
    }
  }
  if (!allowWithName && !allowWithoutName) {
    return null;
  }
  const resName =
    rows[0].reserved_by_name != null ? String(rows[0].reserved_by_name).trim() : '';
  if (allowWithName) {
    return resName ? `Забронировано · ${resName}` : 'Забронировано';
  }
  return 'Забронировано';
}

async function handleGetGiftDetails(response, requestUrl, idUser, giftIdRaw) {
  const giftId = String(giftIdRaw || '').trim();
  if (!/^\d+$/.test(giftId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор подарка' });
    return;
  }

  const forViewerRaw = requestUrl.searchParams.get('forViewer');
  const forViewerTrim = forViewerRaw != null ? String(forViewerRaw).trim() : '';

  try {
    const [users] = await db.query('SELECT id, id_user FROM users WHERE id_user = ? LIMIT 1', [idUser]);
    if (users.length === 0) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    const ownerId = users[0].id;
    const ownerIdUserNum = Number(users[0].id_user);

    let forViewerInternalId = null;
    if (forViewerTrim && /^\d{1,8}$/.test(forViewerTrim)) {
      const forViewerIdUser = Number(forViewerTrim);
      if (forViewerIdUser !== ownerIdUserNum) {
        const [vRows] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [
          forViewerIdUser,
        ]);
        if (!vRows.length) {
          sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
          return;
        }
        forViewerInternalId = vRows[0].id;
        const visible = await giftVisibleToFriendViewer(
          ownerId,
          forViewerInternalId,
          Number(giftId)
        );
        if (!visible) {
          sendJson(response, 403, { success: false, error: 'Нет доступа к подарку' });
          return;
        }
      } else {
        const [vRows] = await db.query('SELECT id FROM users WHERE id_user = ? LIMIT 1', [
          forViewerIdUser,
        ]);
        if (vRows.length) {
          forViewerInternalId = vRows[0].id;
        }
      }
    }

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
        w.title_wishlist,
        w.reservation_display,
        r.reservation_id,
        r.reserved_by AS reserver_internal_id,
        ru.name AS reserved_by_name
      FROM gifts g
      INNER JOIN gift_wishlists gw ON gw.gift_id = g.gift_id
      INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
      LEFT JOIN reservations r ON r.gift_id = g.gift_id
      LEFT JOIN users ru ON ru.id = r.reserved_by
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
    const giftStatus = first.status || 'free';
    const hasReservationRow = Boolean(first.reservation_id);
    const isReserved = hasReservationRow || giftStatus === 'reserved' || giftStatus === 'gifted';

    let reservationPayload = null;
    if (forViewerInternalId != null) {
      const reservedByMe =
        hasReservationRow && Number(first.reserver_internal_id) === Number(forViewerInternalId);
      const viewingOwnGift = Number(forViewerTrim) === ownerIdUserNum;
      const canReserve =
        !viewingOwnGift && !isReserved && giftStatus === 'free' && !hasReservationRow;
      reservationPayload = {
        status: giftStatus,
        isReserved,
        reservedByMe,
        canReserve,
        reservationLabel: viewingOwnGift
          ? buildGiftDetailReservationLabel(rows)
          : buildNonOwnerReservationLabel(giftStatus, hasReservationRow),
      };
    }

    sendJson(response, 200, {
      success: true,
      gift: {
        id: String(first.gift_id),
        title: first.title_gift,
        description: first.description_gift || '',
        price: first.price != null ? String(first.price) : '',
        url: first.url || '',
        imagePath: first.image_path || null,
        status: giftStatus,
        wishlistIds: rows.map((r) => String(r.wishlist_id)),
        wishlists: rows.map((r) => ({
          id: String(r.wishlist_id),
          title: r.title_wishlist,
        })),
        reservation: reservationPayload,
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

async function handleReserveGift(request, response, viewerIdUser, giftIdRaw) {
  const giftId = String(giftIdRaw || '').trim();
  if (!/^\d+$/.test(giftId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор подарка' });
    return;
  }

  let body = {};
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const ownerIdUserRaw = body.ownerIdUser != null ? body.ownerIdUser : body.giftOwnerIdUser;
  const ownerIdUser = Number(String(ownerIdUserRaw || '').trim());
  if (!Number.isInteger(ownerIdUser) || ownerIdUser <= 0 || !/^\d{1,8}$/.test(String(ownerIdUser))) {
    sendJson(response, 400, { success: false, error: 'Укажите владельца подарка (ownerIdUser)' });
    return;
  }

  const viewer = await resolveInternalUserByIdUser(viewerIdUser);
  const owner = await resolveInternalUserByIdUser(ownerIdUser);
  if (!viewer || !owner) {
    sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
    return;
  }
  if (Number(viewer.id) === Number(owner.id)) {
    sendJson(response, 400, { success: false, error: 'Нельзя бронировать свой подарок' });
    return;
  }

  const [friendRows] = await db.query(
    `
    SELECT 1 AS ok
    FROM friends f
    WHERE (f.user_id = ? AND f.friend_id = ?) OR (f.friend_id = ? AND f.user_id = ?)
    LIMIT 1
    `,
    [viewer.id, owner.id, viewer.id, owner.id]
  );
  if (!friendRows.length) {
    sendJson(response, 403, { success: false, error: 'Пользователь не в вашем списке друзей' });
    return;
  }

  const visible = await giftVisibleToFriendViewer(owner.id, viewer.id, Number(giftId));
  if (!visible) {
    sendJson(response, 403, { success: false, error: 'Подробности подарка недоступны' });
    return;
  }

  const [verifyGift] = await db.query(
    `
    SELECT g.gift_id
    FROM gifts g
    INNER JOIN gift_wishlists gw ON gw.gift_id = g.gift_id
    INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
    WHERE g.gift_id = ? AND w.owner_id = ?
    LIMIT 1
    `,
    [Number(giftId), owner.id]
  );
  if (!verifyGift.length) {
    sendJson(response, 404, { success: false, error: 'Подарок не найден' });
    return;
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [locked] = await connection.query(
      'SELECT gift_id, status FROM gifts WHERE gift_id = ? FOR UPDATE',
      [Number(giftId)]
    );
    if (!locked.length) {
      await connection.rollback();
      sendJson(response, 404, { success: false, error: 'Подарок не найден' });
      return;
    }
    if (locked[0].status !== 'free') {
      await connection.rollback();
      sendJson(response, 409, {
        success: false,
        error: 'Подарок нельзя забронировать',
      });
      return;
    }

    const [existingR] = await connection.query(
      'SELECT reservation_id FROM reservations WHERE gift_id = ? LIMIT 1',
      [Number(giftId)]
    );
    if (existingR.length) {
      await connection.rollback();
      sendJson(response, 409, { success: false, error: 'Подарок уже забронирован' });
      return;
    }

    await connection.query('INSERT INTO reservations (gift_id, reserved_by) VALUES (?, ?)', [
      Number(giftId),
      viewer.id,
    ]);
    await connection.query("UPDATE gifts SET status = 'reserved' WHERE gift_id = ?", [
      Number(giftId),
    ]);
    await connection.query(
      "INSERT INTO reservation_history (user_id, gift_id, status) VALUES (?, ?, 'reserved')",
      [viewer.id, Number(giftId)]
    );

    await connection.commit();
    sendJson(response, 201, { success: true });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    if (error && error.code === 'ER_DUP_ENTRY') {
      sendJson(response, 409, { success: false, error: 'Подарок уже забронирован' });
      return;
    }
    logServerError('RESERVE GIFT ERROR', error, { viewerIdUser, giftId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось забронировать подарок',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function handleCancelGiftReservation(response, viewerIdUser, giftIdRaw) {
  const giftId = String(giftIdRaw || '').trim();
  if (!/^\d+$/.test(giftId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор подарка' });
    return;
  }

  const viewer = await resolveInternalUserByIdUser(viewerIdUser);
  if (!viewer) {
    sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
    return;
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT reservation_id, reserved_by FROM reservations WHERE gift_id = ? FOR UPDATE',
      [Number(giftId)]
    );
    if (!rows.length) {
      await connection.rollback();
      sendJson(response, 409, { success: false, error: 'Активной брони нет' });
      return;
    }
    if (Number(rows[0].reserved_by) !== Number(viewer.id)) {
      await connection.rollback();
      sendJson(response, 403, { success: false, error: 'Вы не бронировали этот подарок' });
      return;
    }

    await connection.query('DELETE FROM reservations WHERE gift_id = ?', [Number(giftId)]);
    await connection.query(
      "UPDATE gifts SET status = 'free' WHERE gift_id = ? AND status <> 'gifted'",
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
    logServerError('CANCEL RESERVATION ERROR', error, { viewerIdUser, giftId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось снять бронь',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function handlePatchGiftFulfillment(request, response, idUser, giftIdRaw) {
  const giftId = Number(String(giftIdRaw || '').trim());
  if (!Number.isInteger(giftId) || giftId < 1) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор подарка' });
    return;
  }

  let body = {};
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const fulfilledRaw = body.fulfilled;
  const fulfilled =
    fulfilledRaw === true || fulfilledRaw === 'true' || fulfilledRaw === 1 || fulfilledRaw === '1';
  const unfulfilled =
    fulfilledRaw === false || fulfilledRaw === 'false' || fulfilledRaw === 0 || fulfilledRaw === '0';
  if (!fulfilled && !unfulfilled) {
    sendJson(response, 400, {
      success: false,
      error: 'Укажите fulfilled: true (желание исполнено) или false (снять отметку)',
    });
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

    const [accessRows] = await db.query(
      `
      SELECT g.gift_id
      FROM gifts g
      INNER JOIN gift_wishlists gw ON gw.gift_id = g.gift_id
      INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
      WHERE g.gift_id = ? AND w.owner_id = ?
      LIMIT 1
      `,
      [giftId, ownerId]
    );
    if (!accessRows.length) {
      sendJson(response, 404, { success: false, error: 'Подарок не найден' });
      return;
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [locked] = await connection.query('SELECT gift_id, status FROM gifts WHERE gift_id = ? FOR UPDATE', [
      giftId,
    ]);
    if (!locked.length) {
      await connection.rollback();
      sendJson(response, 404, { success: false, error: 'Подарок не найден' });
      return;
    }

    if (fulfilled) {
      await connection.query("UPDATE gifts SET status = 'gifted' WHERE gift_id = ?", [giftId]);
    } else {
      const [resRows] = await connection.query('SELECT reservation_id FROM reservations WHERE gift_id = ? LIMIT 1', [
        giftId,
      ]);
      const hasReservation = resRows.length > 0;
      const nextStatus = hasReservation ? 'reserved' : 'free';
      await connection.query('UPDATE gifts SET status = ? WHERE gift_id = ?', [nextStatus, giftId]);
    }

    const [outRows] = await connection.query('SELECT status FROM gifts WHERE gift_id = ? LIMIT 1', [giftId]);
    const newStatus =
      outRows.length && outRows[0].status && typeof outRows[0].status === 'string'
        ? outRows[0].status
        : 'free';

    await connection.commit();
    sendJson(response, 200, { success: true, status: newStatus });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    logServerError('PATCH GIFT FULFILLMENT ERROR', error, { idUser, giftId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось обновить статус желания',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
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
        w.status,
        w.reservation_display,
        DATE_FORMAT(w.date_event, '%Y-%m-%d') AS date_event,
        g.gift_id,
        g.title_gift,
        g.description_gift,
        g.image_path,
        g.price,
        g.status AS gift_status,
        r.reservation_id,
        ru.name AS reserved_by_name
      FROM wishlists AS w
      INNER JOIN users AS u ON u.id = w.owner_id
      LEFT JOIN gift_wishlists AS gw ON gw.wishlist_id = w.wishlist_id
      LEFT JOIN gifts AS g ON g.gift_id = gw.gift_id
      LEFT JOIN reservations AS r ON r.gift_id = g.gift_id
      LEFT JOIN users AS ru ON ru.id = r.reserved_by
      WHERE u.id_user = ?
      ORDER BY w.created_at DESC, g.created_at ASC
      `,
      [idUser]
    );

    const wishlistsById = new Map();
    for (const row of rows) {
      if (!wishlistsById.has(row.wishlist_id)) {
        const rawStatus = row.status && WISHLIST_STATUS_VALUES.includes(row.status) ? row.status : 'private';
        const reservationDisplay = normalizeReservationDisplay(row.reservation_display);
        wishlistsById.set(row.wishlist_id, {
          id: String(row.wishlist_id),
          title: row.title_wishlist,
          description: row.description_wishlist || '',
          icon: row.icon || 'basic',
          status: rawStatus,
          reservationDisplay,
          allowedFriendIdUsers: [],
          eventDate: row.date_event || '',
          wishes: [],
        });
      }

      if (row.gift_id) {
        const wl = wishlistsById.get(row.wishlist_id);
        const giftSt = row.gift_status && typeof row.gift_status === 'string' ? row.gift_status : 'free';
        const rd = wl.reservationDisplay;
        let reservationLabel = null;
        if (giftSt === 'gifted') {
          reservationLabel = 'Исполнено';
        } else if (rd !== 'hidden' && row.reservation_id) {
          if (rd === 'show_without_name') {
            reservationLabel = 'Забронировано';
          } else if (rd === 'show_with_name') {
            const resName = row.reserved_by_name != null ? String(row.reserved_by_name).trim() : '';
            reservationLabel = resName ? `Забронировано · ${resName}` : 'Забронировано';
          }
        }
        wl.wishes.push({
          id: `gift_${row.gift_id}`,
          giftId: String(row.gift_id),
          title: row.title_gift,
          note: row.description_gift || '',
          imagePath: row.image_path || null,
          price: row.price != null ? row.price : null,
          reservationLabel,
        });
      }
    }

    const wishlistIds = Array.from(wishlistsById.keys());
    if (wishlistIds.length > 0) {
      const placeholders = wishlistIds.map(() => '?').join(',');
      const [accessRows] = await db.query(
        `
        SELECT wa.wishlist_id, u.id_user
        FROM wishlist_access wa
        INNER JOIN users u ON u.id = wa.friend_id
        WHERE wa.wishlist_id IN (${placeholders})
        ORDER BY wa.wishlist_id, u.id_user
        `,
        wishlistIds
      );
      for (const row of accessRows) {
        const wl = wishlistsById.get(row.wishlist_id);
        if (wl) {
          wl.allowedFriendIdUsers.push(Number(row.id_user));
        }
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

/** Списки друга, видимые текущему пользователю (дружба + публичные / общие для друзей / выборочный доступ). */
async function handleGetFriendWishlists(response, viewerIdUser, ownerIdUser) {
  try {
    const viewer = await resolveInternalUserByIdUser(viewerIdUser);
    const owner = await resolveInternalUserByIdUser(ownerIdUser);
    if (!viewer || !owner) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    if (Number(viewer.id) === Number(owner.id)) {
      sendJson(response, 400, {
        success: false,
        error: 'Свои списки смотрите в разделе «Списки желаний»',
      });
      return;
    }

    const [friendRows] = await db.query(
      `
      SELECT 1 AS ok
      FROM friends f
      WHERE (f.user_id = ? AND f.friend_id = ?) OR (f.friend_id = ? AND f.user_id = ?)
      LIMIT 1
      `,
      [viewer.id, owner.id, viewer.id, owner.id]
    );
    const isFriend = friendRows.length > 0;

    let rows;
    if (isFriend) {
      const [friendWishlistRows] = await db.query(
        `
        SELECT
          w.wishlist_id,
          w.title_wishlist,
          w.description_wishlist,
          w.icon,
          w.status,
          w.reservation_display,
          DATE_FORMAT(w.date_event, '%Y-%m-%d') AS date_event,
          g.gift_id,
          g.title_gift,
          g.description_gift,
          g.image_path,
          g.price,
          g.status AS gift_status,
          r.reservation_id,
          ru.name AS reserved_by_name
        FROM wishlists AS w
        INNER JOIN users AS u ON u.id = w.owner_id
        LEFT JOIN gift_wishlists AS gw ON gw.wishlist_id = w.wishlist_id
        LEFT JOIN gifts AS g ON g.gift_id = gw.gift_id
        LEFT JOIN reservations AS r ON r.gift_id = g.gift_id
        LEFT JOIN users AS ru ON ru.id = r.reserved_by
        WHERE u.id = ?
          AND (
            w.status = 'public'
            OR (
              w.status = 'shared'
              AND (
                NOT EXISTS (
                  SELECT 1 FROM wishlist_access wa0 WHERE wa0.wishlist_id = w.wishlist_id
                )
                OR EXISTS (
                  SELECT 1 FROM wishlist_access wa1
                  WHERE wa1.wishlist_id = w.wishlist_id AND wa1.friend_id = ?
                )
              )
            )
          )
        ORDER BY w.created_at DESC, g.created_at ASC
        `,
        [owner.id, viewer.id]
      );
      rows = friendWishlistRows;
    } else {
      const [publicRows] = await db.query(
        `
        SELECT
          w.wishlist_id,
          w.title_wishlist,
          w.description_wishlist,
          w.icon,
          w.status,
          w.reservation_display,
          DATE_FORMAT(w.date_event, '%Y-%m-%d') AS date_event,
          g.gift_id,
          g.title_gift,
          g.description_gift,
          g.image_path,
          g.price,
          g.status AS gift_status,
          r.reservation_id,
          ru.name AS reserved_by_name
        FROM wishlists AS w
        INNER JOIN users AS u ON u.id = w.owner_id
        LEFT JOIN gift_wishlists AS gw ON gw.wishlist_id = w.wishlist_id
        LEFT JOIN gifts AS g ON g.gift_id = gw.gift_id
        LEFT JOIN reservations AS r ON r.gift_id = g.gift_id
        LEFT JOIN users AS ru ON ru.id = r.reserved_by
        WHERE u.id = ?
          AND w.status = 'public'
        ORDER BY w.created_at DESC, g.created_at ASC
        `,
        [owner.id]
      );
      rows = publicRows;
    }

    const wishlistsById = new Map();
    for (const row of rows) {
      if (!wishlistsById.has(row.wishlist_id)) {
        const rawStatus = row.status && WISHLIST_STATUS_VALUES.includes(row.status) ? row.status : 'private';
        const reservationDisplay = normalizeReservationDisplay(row.reservation_display);
        wishlistsById.set(row.wishlist_id, {
          id: String(row.wishlist_id),
          title: row.title_wishlist,
          description: row.description_wishlist || '',
          icon: row.icon || 'basic',
          status: rawStatus,
          reservationDisplay,
          allowedFriendIdUsers: [],
          eventDate: row.date_event || '',
          wishes: [],
        });
      }

      if (row.gift_id) {
        const wl = wishlistsById.get(row.wishlist_id);
        const giftSt = row.gift_status && typeof row.gift_status === 'string' ? row.gift_status : 'free';
        /* Статус брони виден другу; имя бронирующего не показываем (только владельцу — в «Мои списки») */
        const reservationLabel = buildNonOwnerReservationLabel(giftSt, Boolean(row.reservation_id));
        const isReservedGift =
          Boolean(row.reservation_id) || giftSt === 'reserved' || giftSt === 'gifted';
        wl.wishes.push({
          id: `gift_${row.gift_id}`,
          giftId: String(row.gift_id),
          title: row.title_gift,
          note: row.description_gift || '',
          imagePath: row.image_path || null,
          price: row.price != null ? row.price : null,
          reservationLabel,
          isReserved: isReservedGift,
        });
      }
    }

    sendJson(response, 200, {
      success: true,
      wishlists: Array.from(wishlistsById.values()),
    });
  } catch (error) {
    logServerError('GET FRIEND WISHLISTS ERROR', error, { viewerIdUser, ownerIdUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось получить списки желаний друга',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function resolveInternalUserByIdUser(idUser) {
  const [rows] = await db.query(
    `
    SELECT id, id_user, name
    FROM users
    WHERE id_user = ?
    LIMIT 1
    `,
    [idUser]
  );
  return rows[0] || null;
}

async function handleGetFriends(response, idUser) {
  try {
    const user = await resolveInternalUserByIdUser(idUser);
    if (!user) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const [rows] = await db.query(
      `
      SELECT
        u.id AS friend_internal_id,
        u.id_user,
        u.name,
        u.email,
        DATE_FORMAT(u.birthday, '%Y-%m-%d') AS birthday,
        u.description_user,
        u.avatar
      FROM friends f
      INNER JOIN users u
        ON u.id = CASE
          WHEN f.user_id = ? THEN f.friend_id
          ELSE f.user_id
        END
      WHERE f.user_id = ? OR f.friend_id = ?
      ORDER BY f.created_at DESC
      `,
      [user.id, user.id, user.id]
    );

    sendJson(response, 200, {
      success: true,
      friends: rows.map((row) => ({
        id: String(row.friend_internal_id),
        id_user: row.id_user,
        name: row.name,
        email: row.email,
        birthday: row.birthday,
        description_user: row.description_user || '',
        avatar: row.avatar || null,
      })),
    });
  } catch (error) {
    logServerError('GET FRIENDS ERROR', error, { idUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось получить список друзей',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleRemoveFriend(response, viewerIdUser, friendIdUser) {
  let connection;
  try {
    const viewer = await resolveInternalUserByIdUser(viewerIdUser);
    if (!viewer) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    const target = await resolveInternalUserByIdUser(Number(friendIdUser));
    if (!target) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    if (viewer.id === target.id) {
      sendJson(response, 400, { success: false, error: 'Некорректный запрос' });
      return;
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [friendRows] = await connection.query(
      `
      SELECT relations_id
      FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      LIMIT 1
      `,
      [viewer.id, target.id, target.id, viewer.id]
    );
    if (!friendRows.length) {
      await connection.rollback();
      sendJson(response, 404, { success: false, error: 'Пользователь не в списке друзей' });
      return;
    }

    await connection.query(
      `
      DELETE wa FROM wishlist_access wa
      INNER JOIN wishlists w ON w.wishlist_id = wa.wishlist_id
      WHERE w.owner_id = ? AND wa.friend_id = ?
      `,
      [viewer.id, target.id]
    );
    await connection.query(
      `
      DELETE wa FROM wishlist_access wa
      INNER JOIN wishlists w ON w.wishlist_id = wa.wishlist_id
      WHERE w.owner_id = ? AND wa.friend_id = ?
      `,
      [target.id, viewer.id]
    );

    await connection.query(
      `
      DELETE FROM friend_requests
      WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
      `,
      [viewer.id, target.id, target.id, viewer.id]
    );

    const [delFriends] = await connection.query(
      `
      DELETE FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `,
      [viewer.id, target.id, target.id, viewer.id]
    );
    const removedRows = delFriends && typeof delFriends.affectedRows === 'number' ? delFriends.affectedRows : 0;
    if (!removedRows) {
      await connection.rollback();
      sendJson(response, 500, {
        success: false,
        error: 'Не удалось удалить запись о дружбе',
      });
      return;
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
    logServerError('REMOVE FRIEND ERROR', error, { viewerIdUser, friendIdUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось удалить из друзей',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function handleSearchUserForFriend(response, idUser, targetIdUser) {
  try {
    const currentUser = await resolveInternalUserByIdUser(idUser);
    if (!currentUser) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    if (Number(idUser) === Number(targetIdUser)) {
      sendJson(response, 400, { success: false, error: 'Нельзя добавить самого себя' });
      return;
    }

    const targetUser = await resolveInternalUserByIdUser(Number(targetIdUser));
    if (!targetUser) {
      sendJson(response, 404, { success: false, error: 'Пользователь с таким ID не найден' });
      return;
    }

    const [friendRows] = await db.query(
      `
      SELECT relations_id
      FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      LIMIT 1
      `,
      [currentUser.id, targetUser.id, targetUser.id, currentUser.id]
    );

    let relationStatus = 'none';
    if (friendRows.length > 0) {
      relationStatus = 'accepted';
    } else {
      const [incomingPendingRows] = await db.query(
        `
        SELECT friend_request_id
        FROM friend_requests
        WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'
        LIMIT 1
        `,
        [targetUser.id, currentUser.id]
      );
      if (incomingPendingRows.length > 0) {
        relationStatus = 'pending_incoming';
      } else {
        const [outgoingRows] = await db.query(
          `
          SELECT status
          FROM friend_requests
          WHERE from_user_id = ? AND to_user_id = ?
          ORDER BY updated_at DESC
          LIMIT 1
          `,
          [currentUser.id, targetUser.id]
        );
        if (outgoingRows.length > 0 && outgoingRows[0].status) {
          relationStatus = outgoingRows[0].status;
        }
      }
    }

    sendJson(response, 200, {
      success: true,
      user: {
        id: String(targetUser.id),
        id_user: targetUser.id_user,
        name: targetUser.name,
        relationStatus,
      },
    });
  } catch (error) {
    logServerError('SEARCH USER FOR FRIEND ERROR', error, { idUser, targetIdUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось найти пользователя',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleCancelOutgoingFriendRequest(response, viewerIdUser, targetIdUser) {
  try {
    const viewer = await resolveInternalUserByIdUser(viewerIdUser);
    if (!viewer) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    const target = await resolveInternalUserByIdUser(Number(targetIdUser));
    if (!target) {
      sendJson(response, 404, { success: false, error: 'Пользователь с таким ID не найден' });
      return;
    }
    if (viewer.id === target.id) {
      sendJson(response, 400, { success: false, error: 'Некорректный запрос' });
      return;
    }
    const [result] = await db.query(
      `
      DELETE FROM friend_requests
      WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'
      `,
      [viewer.id, target.id]
    );
    if (!result.affectedRows) {
      sendJson(response, 404, {
        success: false,
        error: 'Исходящей заявки нет или она уже обработана',
      });
      return;
    }
    sendJson(response, 200, { success: true, cancelled: true });
  } catch (error) {
    logServerError('CANCEL OUTGOING FRIEND REQUEST ERROR', error, { viewerIdUser, targetIdUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось отменить заявку',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleCreateFriendRequest(request, response, idUser) {
  let requestBody = {};
  try {
    requestBody = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const toIdUserRaw = String(requestBody.toIdUser || '').trim();
  if (!/^\d{1,8}$/.test(toIdUserRaw)) {
    sendJson(response, 400, { success: false, error: 'Укажите корректный id_user' });
    return;
  }

  try {
    const fromUser = await resolveInternalUserByIdUser(idUser);
    if (!fromUser) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const toUser = await resolveInternalUserByIdUser(Number(toIdUserRaw));
    if (!toUser) {
      sendJson(response, 404, { success: false, error: 'Пользователь с таким ID не найден' });
      return;
    }

    if (fromUser.id === toUser.id) {
      sendJson(response, 400, { success: false, error: 'Нельзя отправить заявку самому себе' });
      return;
    }

    const [friendRows] = await db.query(
      `
      SELECT relations_id
      FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      LIMIT 1
      `,
      [fromUser.id, toUser.id, toUser.id, fromUser.id]
    );
    if (friendRows.length > 0) {
      sendJson(response, 409, { success: false, error: 'Этот пользователь уже у вас в друзьях' });
      return;
    }

    const [sameDirectionRows] = await db.query(
      `
      SELECT friend_request_id, status
      FROM friend_requests
      WHERE from_user_id = ? AND to_user_id = ?
      LIMIT 1
      `,
      [fromUser.id, toUser.id]
    );

    if (sameDirectionRows.length > 0 && sameDirectionRows[0].status === 'pending') {
      sendJson(response, 409, { success: false, error: 'Заявка уже отправлена' });
      return;
    }

    if (sameDirectionRows.length > 0) {
      await db.query(
        `
        UPDATE friend_requests
        SET status = 'pending'
        WHERE friend_request_id = ?
        `,
        [sameDirectionRows[0].friend_request_id]
      );
      sendJson(response, 200, {
        success: true,
        request: {
          fromIdUser: fromUser.id_user,
          toIdUser: toUser.id_user,
          status: 'pending',
        },
      });
      return;
    }

    await db.query(
      `
      INSERT INTO friend_requests (from_user_id, to_user_id, status)
      VALUES (?, ?, 'pending')
      `,
      [fromUser.id, toUser.id]
    );

    sendJson(response, 201, {
      success: true,
      request: {
        fromIdUser: fromUser.id_user,
        toIdUser: toUser.id_user,
        status: 'pending',
      },
    });
  } catch (error) {
    logServerError('CREATE FRIEND REQUEST ERROR', error, { idUser, toIdUserRaw });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось отправить заявку в друзья',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleGetIncomingFriendRequests(response, idUser) {
  try {
    const viewer = await resolveInternalUserByIdUser(idUser);
    if (!viewer) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const [rows] = await db.query(
      `
      SELECT
        fr.friend_request_id,
        u.id_user,
        u.name,
        u.avatar
      FROM friend_requests fr
      INNER JOIN users u ON u.id = fr.from_user_id
      WHERE fr.to_user_id = ? AND fr.status = 'pending'
      ORDER BY fr.friend_request_id DESC
      `,
      [viewer.id]
    );

    sendJson(response, 200, {
      success: true,
      requests: rows.map((row) => ({
        requestId: String(row.friend_request_id),
        fromUser: {
          id_user: row.id_user,
          name: row.name,
          avatar: row.avatar || null,
        },
      })),
    });
  } catch (error) {
    logServerError('GET INCOMING FRIEND REQUESTS ERROR', error, { idUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось загрузить заявки в друзья',
      technical: error.sqlMessage || error.message,
    });
  }
}

/** Профиль пользователя + только публичные списки (для вкладки «Заявки»: входящие / поиск по id_user). */
async function handleGetUserPublicPreview(response, viewerIdUser, targetIdUser) {
  try {
    const viewer = await resolveInternalUserByIdUser(viewerIdUser);
    const target = await resolveInternalUserByIdUser(targetIdUser);
    if (!viewer || !target) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    if (Number(viewer.id) === Number(target.id)) {
      sendJson(response, 400, {
        success: false,
        error: 'Откройте свой профиль в разделе «Профиль»',
      });
      return;
    }

    const [profileRows] = await db.query(
      `
      SELECT
        id,
        name,
        id_user,
        DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday,
        description_user,
        avatar
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [target.id]
    );
    if (!profileRows.length) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    const p = profileRows[0];

    const [rows] = await db.query(
      `
      SELECT
        w.wishlist_id,
        w.title_wishlist,
        w.description_wishlist,
        w.icon,
        w.status,
        w.reservation_display,
        DATE_FORMAT(w.date_event, '%Y-%m-%d') AS date_event,
        g.gift_id,
        g.title_gift,
        g.description_gift,
        g.image_path,
        g.price,
        g.status AS gift_status,
        r.reservation_id,
        ru.name AS reserved_by_name
      FROM wishlists AS w
      INNER JOIN users AS u ON u.id = w.owner_id
      LEFT JOIN gift_wishlists AS gw ON gw.wishlist_id = w.wishlist_id
      LEFT JOIN gifts AS g ON g.gift_id = gw.gift_id
      LEFT JOIN reservations AS r ON r.gift_id = g.gift_id
      LEFT JOIN users AS ru ON ru.id = r.reserved_by
      WHERE u.id = ?
        AND w.status = 'public'
      ORDER BY w.created_at DESC, g.created_at ASC
      `,
      [target.id]
    );

    const wishlistsById = new Map();
    for (const row of rows) {
      if (!wishlistsById.has(row.wishlist_id)) {
        const rawStatus = row.status && WISHLIST_STATUS_VALUES.includes(row.status) ? row.status : 'private';
        const reservationDisplay = normalizeReservationDisplay(row.reservation_display);
        wishlistsById.set(row.wishlist_id, {
          id: String(row.wishlist_id),
          title: row.title_wishlist,
          description: row.description_wishlist || '',
          icon: row.icon || 'basic',
          status: rawStatus,
          reservationDisplay,
          allowedFriendIdUsers: [],
          eventDate: row.date_event || '',
          wishes: [],
        });
      }

      if (row.gift_id) {
        const wl = wishlistsById.get(row.wishlist_id);
        const giftSt = row.gift_status && typeof row.gift_status === 'string' ? row.gift_status : 'free';
        const reservationLabel = buildNonOwnerReservationLabel(giftSt, Boolean(row.reservation_id));
        const isReservedGift =
          Boolean(row.reservation_id) || giftSt === 'reserved' || giftSt === 'gifted';
        wl.wishes.push({
          id: `gift_${row.gift_id}`,
          giftId: String(row.gift_id),
          title: row.title_gift,
          note: row.description_gift || '',
          imagePath: row.image_path || null,
          price: row.price != null ? row.price : null,
          reservationLabel,
          isReserved: isReservedGift,
        });
      }
    }

    sendJson(response, 200, {
      success: true,
      profile: {
        id: String(p.id),
        id_user: p.id_user,
        name: p.name,
        birthday: p.birthday,
        description_user: p.description_user || '',
        avatar: p.avatar || null,
      },
      wishlists: Array.from(wishlistsById.values()),
    });
  } catch (error) {
    logServerError('GET USER PUBLIC PREVIEW ERROR', error, { viewerIdUser, targetIdUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось загрузить профиль',
      technical: error.sqlMessage || error.message,
    });
  }
}

/** Подарки у друзей: ваша бронь или уже отмеченные владельцем как исполненные (при сохранённой записи брони). */
async function handleGetGiftsToFriends(response, viewerIdUser) {
  try {
    const viewer = await resolveInternalUserByIdUser(viewerIdUser);
    if (!viewer) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }

    const [rows] = await db.query(
      `
      SELECT
        g.gift_id,
        g.title_gift,
        g.image_path,
        g.price,
        g.status AS gift_status,
        MAX(ou.id_user) AS owner_id_user,
        MAX(ou.name) AS owner_name,
        MIN(w.wishlist_id) AS wishlist_id
      FROM reservations r
      INNER JOIN gifts g ON g.gift_id = r.gift_id
      INNER JOIN users me ON me.id = r.reserved_by
      INNER JOIN gift_wishlists gw ON gw.gift_id = g.gift_id
      INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
      INNER JOIN users ou ON ou.id = w.owner_id
      WHERE me.id_user = ?
        AND ou.id <> me.id
      GROUP BY g.gift_id, g.title_gift, g.image_path, g.price, g.status
      ORDER BY g.gift_id DESC
      `,
      [viewerIdUser]
    );

    const items = rows.map((row) => {
      const st = row.gift_status && typeof row.gift_status === 'string' ? row.gift_status : 'free';
      const rowState = st === 'gifted' ? 'fulfilled' : 'reserved';
      const stateLabel = st === 'gifted' ? 'Исполнено' : 'Забронировано';
      return {
        giftId: String(row.gift_id),
        title: row.title_gift || '',
        imagePath: row.image_path || null,
        price: row.price != null ? String(row.price) : '',
        giftStatus: st,
        rowState,
        stateLabel,
        ownerIdUser: Number(row.owner_id_user),
        ownerName: row.owner_name || '',
        wishlistId: row.wishlist_id != null ? String(row.wishlist_id) : null,
      };
    });

    sendJson(response, 200, { success: true, items });
  } catch (error) {
    logServerError('GET GIFTS TO FRIENDS ERROR', error, { viewerIdUser });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось загрузить список подарков',
      technical: error.sqlMessage || error.message,
    });
  }
}

/** Синхронизируйте с src/constants/giftReportReasons.js */
const GIFT_REPORT_REASON_DEFINITIONS = [
  { id: 'spam', label: 'Спам или реклама', requiresDetails: false },
  {
    id: 'inappropriate',
    label: 'Оскорбительное или неприемлемое содержание',
    requiresDetails: true,
  },
  { id: 'fraud', label: 'Мошенничество или недопустимые ссылки', requiresDetails: true },
  { id: 'misleading', label: 'Вводящая в заблуждение информация', requiresDetails: true },
  { id: 'other', label: 'Другое', requiresDetails: true },
];
const GIFT_REPORT_REASON_BY_ID = new Map(GIFT_REPORT_REASON_DEFINITIONS.map((r) => [r.id, r]));
const MIN_GIFT_REPORT_DETAIL_LENGTH = 12;

async function handleCreateGiftReport(request, response, reporterIdUser, giftIdRaw) {
  const giftIdNum = Number(String(giftIdRaw || '').trim());
  if (!Number.isInteger(giftIdNum) || giftIdNum < 1) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор подарка' });
    return;
  }

  let body = {};
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const ownerIdUserRaw = body.ownerIdUser != null ? Number(body.ownerIdUser) : NaN;
  if (!Number.isInteger(ownerIdUserRaw) || ownerIdUserRaw < 1) {
    sendJson(response, 400, { success: false, error: 'Укажите владельца подарка' });
    return;
  }

  const reasonId = typeof body.reason === 'string' ? body.reason.trim().toLowerCase() : '';
  const reasonDef = GIFT_REPORT_REASON_BY_ID.get(reasonId);
  if (!reasonDef) {
    sendJson(response, 400, { success: false, error: 'Выберите причину из списка' });
    return;
  }

  const descriptionRaw = typeof body.description === 'string' ? body.description.trim() : '';
  if (reasonDef.requiresDetails && descriptionRaw.length < MIN_GIFT_REPORT_DETAIL_LENGTH) {
    sendJson(response, 400, {
      success: false,
      error: `Опишите подробнее (минимум ${MIN_GIFT_REPORT_DETAIL_LENGTH} символов)`,
    });
    return;
  }

  let wishlistSqlId = null;
  if (body.wishlistId != null && String(body.wishlistId).trim() !== '') {
    const wn = Number(body.wishlistId);
    if (Number.isInteger(wn) && wn > 0) {
      wishlistSqlId = wn;
    }
  }

  try {
    const reporter = await resolveInternalUserByIdUser(reporterIdUser);
    if (!reporter) {
      sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
      return;
    }
    if (Number(reporter.id_user) === ownerIdUserRaw) {
      sendJson(response, 403, { success: false, error: 'Нельзя пожаловаться на свой подарок' });
      return;
    }

    const ownerUser = await resolveInternalUserByIdUser(ownerIdUserRaw);
    if (!ownerUser) {
      sendJson(response, 400, { success: false, error: 'Владелец подарка не найден' });
      return;
    }
    const ownerInternalId = ownerUser.id;

    const [giftOwnerRows] = await db.query(
      `
      SELECT DISTINCT w.owner_id
      FROM gift_wishlists gw
      INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
      WHERE gw.gift_id = ?
      `,
      [giftIdNum]
    );
    if (!giftOwnerRows.length) {
      sendJson(response, 404, { success: false, error: 'Подарок не найден' });
      return;
    }
    const ownerIds = new Set(giftOwnerRows.map((r) => Number(r.owner_id)));
    if (!ownerIds.has(ownerInternalId)) {
      sendJson(response, 403, { success: false, error: 'Неверные данные подарка' });
      return;
    }
    if (ownerIds.size !== 1) {
      sendJson(response, 400, { success: false, error: 'Некорректные данные подарка' });
      return;
    }

    const visible = await giftVisibleToFriendViewer(ownerInternalId, reporter.id, giftIdNum);
    if (!visible) {
      sendJson(response, 403, { success: false, error: 'Нет доступа к этому подарку' });
      return;
    }

    let wishlistForInsert = null;
    if (wishlistSqlId != null) {
      const [wlRows] = await db.query(
        `
        SELECT 1 AS ok
        FROM gift_wishlists gw
        INNER JOIN wishlists w ON w.wishlist_id = gw.wishlist_id
        WHERE gw.gift_id = ? AND gw.wishlist_id = ? AND w.owner_id = ?
        LIMIT 1
        `,
        [giftIdNum, wishlistSqlId, ownerInternalId]
      );
      if (wlRows.length) {
        wishlistForInsert = wishlistSqlId;
      }
    }

    const reasonText = String(reasonDef.label).slice(0, 100);
    const descForDb =
      descriptionRaw.length > 0 ? descriptionRaw.slice(0, 10000) : null;

    await db.query(
      `
      INSERT INTO reports (
        admin_id,
        reporter_id,
        reported_user_id,
        gift_id,
        wishlist_id,
        reason,
        description,
        status
      )
      VALUES (NULL, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [reporter.id, ownerInternalId, giftIdNum, wishlistForInsert, reasonText, descForDb]
    );

    sendJson(response, 201, { success: true });
  } catch (error) {
    logServerError('CREATE GIFT REPORT ERROR', error, { reporterIdUser, giftId: giftIdNum });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось отправить жалобу',
      technical: error.sqlMessage || error.message,
    });
  }
}

async function handleRespondFriendRequest(request, response, idUser, requestIdRaw) {
  const requestId = String(requestIdRaw || '').trim();
  if (!/^\d+$/.test(requestId)) {
    sendJson(response, 400, { success: false, error: 'Некорректный идентификатор заявки' });
    return;
  }

  let body = {};
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { success: false, error: 'Некорректный JSON' });
    return;
  }

  const actionRaw = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
  if (actionRaw !== 'accept' && actionRaw !== 'decline') {
    sendJson(response, 400, {
      success: false,
      error: 'Укажите action: accept или decline',
    });
    return;
  }

  const viewer = await resolveInternalUserByIdUser(idUser);
  if (!viewer) {
    sendJson(response, 404, { success: false, error: 'Пользователь не найден' });
    return;
  }

  if (actionRaw === 'decline') {
    try {
      const [result] = await db.query(
        `
        DELETE FROM friend_requests
        WHERE friend_request_id = ? AND to_user_id = ? AND status = 'pending'
        `,
        [Number(requestId), viewer.id]
      );
      if (!result.affectedRows) {
        sendJson(response, 404, {
          success: false,
          error: 'Заявка не найдена или уже обработана',
        });
        return;
      }
      sendJson(response, 200, { success: true, declined: true });
    } catch (error) {
      logServerError('DECLINE FRIEND REQUEST ERROR', error, { idUser, requestId });
      sendJson(response, 500, {
        success: false,
        error: 'Не удалось отклонить заявку',
        technical: error.sqlMessage || error.message,
      });
    }
    return;
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [reqRows] = await connection.query(
      `
      SELECT friend_request_id, from_user_id, to_user_id
      FROM friend_requests
      WHERE friend_request_id = ? AND to_user_id = ? AND status = 'pending'
      FOR UPDATE
      `,
      [Number(requestId), viewer.id]
    );

    if (!reqRows.length) {
      await connection.rollback();
      sendJson(response, 404, {
        success: false,
        error: 'Заявка не найдена или уже обработана',
      });
      return;
    }

    const fromId = Number(reqRows[0].from_user_id);
    const toId = Number(reqRows[0].to_user_id);

    await connection.query('DELETE FROM friend_requests WHERE friend_request_id = ?', [
      Number(requestId),
    ]);
    await connection.query(
      `
      DELETE FROM friend_requests
      WHERE status = 'pending'
        AND (
          (from_user_id = ? AND to_user_id = ?)
          OR (from_user_id = ? AND to_user_id = ?)
        )
      `,
      [fromId, toId, toId, fromId]
    );

    const userIdPair = Math.min(fromId, toId);
    const friendIdPair = Math.max(fromId, toId);

    const [existingFriend] = await connection.query(
      `
      SELECT relations_id
      FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      LIMIT 1
      `,
      [userIdPair, friendIdPair, friendIdPair, userIdPair]
    );

    if (!existingFriend.length) {
      await connection.query('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [
        userIdPair,
        friendIdPair,
      ]);
    }

    await connection.commit();
    sendJson(response, 200, { success: true, accepted: true });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    if (error && error.code === 'ER_DUP_ENTRY') {
      sendJson(response, 409, {
        success: false,
        error: 'Этот пользователь уже у вас в друзьях',
      });
      return;
    }
    logServerError('ACCEPT FRIEND REQUEST ERROR', error, { idUser, requestId });
    sendJson(response, 500, {
      success: false,
      error: 'Не удалось принять заявку',
      technical: error.sqlMessage || error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function dispatch(request, response) {
  const requestUrl = new URL(request.url, 'http://127.0.0.1');
  const normalizedPathname = normalizePathname(requestUrl.pathname);
  const profileRouteMatch = normalizedPathname.match(/^\/api\/profile\/(\d{8})$/);
  const wishlistsRouteMatch = normalizedPathname.match(/^\/api\/wishlists\/(\d{8})$/);
  const wishlistItemRouteMatch = normalizedPathname.match(/^\/api\/wishlists\/(\d{8})\/(\d+)$/);
  const createGiftRouteMatch = normalizedPathname.match(/^\/api\/gifts\/(\d{1,8})$/);
  const giftReserveRouteMatch = normalizedPathname.match(/^\/api\/gifts\/(\d{1,8})\/(\d+)\/reserve$/);
  const giftFulfillmentRouteMatch = normalizedPathname.match(/^\/api\/gifts\/(\d{1,8})\/(\d+)\/fulfillment$/);
  const giftItemRouteMatch = normalizedPathname.match(/^\/api\/gifts\/(\d{1,8})\/(\d+)$/);
  const giftReportRouteMatch = normalizedPathname.match(/^\/api\/gifts\/(\d{1,8})\/(\d+)\/report$/);
  const friendsRouteMatch = normalizedPathname.match(/^\/api\/friends\/(\d{1,8})$/);
  const friendRemoveRouteMatch = normalizedPathname.match(/^\/api\/friends\/(\d{1,8})\/friend\/(\d{1,8})$/);
  const friendWishlistsRouteMatch = normalizedPathname.match(
    /^\/api\/friends\/(\d{1,8})\/wishlists\/(\d{1,8})$/
  );
  const friendSearchRouteMatch = normalizedPathname.match(/^\/api\/friends\/(\d{1,8})\/search\/(\d{1,8})$/);
  const friendRequestsRouteMatch = normalizedPathname.match(/^\/api\/friends\/(\d{1,8})\/requests$/);
  const friendRequestRespondRouteMatch = normalizedPathname.match(
    /^\/api\/friends\/(\d{1,8})\/requests\/(\d+)$/
  );
  const friendIncomingRequestsRouteMatch = normalizedPathname.match(
    /^\/api\/friends\/(\d{1,8})\/incoming-requests$/
  );
  const friendGiftsToFriendsRouteMatch = normalizedPathname.match(
    /^\/api\/friends\/(\d{1,8})\/gifts-to-friends$/
  );
  const friendCancelOutgoingRouteMatch = normalizedPathname.match(
    /^\/api\/friends\/(\d{1,8})\/outgoing-pending\/(\d{1,8})$/
  );
  const friendUserPreviewRouteMatch = normalizedPathname.match(
    /^\/api\/friends\/(\d{1,8})\/user\/(\d{1,8})\/preview$/
  );

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

  if (giftReserveRouteMatch && request.method === 'POST') {
    await handleReserveGift(
      request,
      response,
      Number(giftReserveRouteMatch[1]),
      giftReserveRouteMatch[2]
    );
    return;
  }

  if (giftReserveRouteMatch && request.method === 'DELETE') {
    await handleCancelGiftReservation(
      response,
      Number(giftReserveRouteMatch[1]),
      giftReserveRouteMatch[2]
    );
    return;
  }

  if (giftReportRouteMatch && request.method === 'POST') {
    await handleCreateGiftReport(
      request,
      response,
      Number(giftReportRouteMatch[1]),
      Number(giftReportRouteMatch[2])
    );
    return;
  }

  if (giftFulfillmentRouteMatch && request.method === 'PATCH') {
    await handlePatchGiftFulfillment(
      request,
      response,
      Number(giftFulfillmentRouteMatch[1]),
      giftFulfillmentRouteMatch[2]
    );
    return;
  }

  if (giftItemRouteMatch && request.method === 'GET') {
    await handleGetGiftDetails(
      response,
      requestUrl,
      Number(giftItemRouteMatch[1]),
      giftItemRouteMatch[2]
    );
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

  if (friendsRouteMatch && request.method === 'GET') {
    await handleGetFriends(response, Number(friendsRouteMatch[1]));
    return;
  }

  if (friendRemoveRouteMatch && request.method === 'DELETE') {
    await handleRemoveFriend(
      response,
      Number(friendRemoveRouteMatch[1]),
      Number(friendRemoveRouteMatch[2])
    );
    return;
  }

  if (friendWishlistsRouteMatch && request.method === 'GET') {
    await handleGetFriendWishlists(
      response,
      Number(friendWishlistsRouteMatch[1]),
      Number(friendWishlistsRouteMatch[2])
    );
    return;
  }

  if (friendSearchRouteMatch && request.method === 'GET') {
    await handleSearchUserForFriend(
      response,
      Number(friendSearchRouteMatch[1]),
      Number(friendSearchRouteMatch[2])
    );
    return;
  }

  if (friendIncomingRequestsRouteMatch && request.method === 'GET') {
    await handleGetIncomingFriendRequests(response, Number(friendIncomingRequestsRouteMatch[1]));
    return;
  }

  if (friendGiftsToFriendsRouteMatch && request.method === 'GET') {
    await handleGetGiftsToFriends(response, Number(friendGiftsToFriendsRouteMatch[1]));
    return;
  }

  if (friendCancelOutgoingRouteMatch && request.method === 'DELETE') {
    await handleCancelOutgoingFriendRequest(
      response,
      Number(friendCancelOutgoingRouteMatch[1]),
      Number(friendCancelOutgoingRouteMatch[2])
    );
    return;
  }

  if (friendUserPreviewRouteMatch && request.method === 'GET') {
    await handleGetUserPublicPreview(
      response,
      Number(friendUserPreviewRouteMatch[1]),
      Number(friendUserPreviewRouteMatch[2])
    );
    return;
  }

  if (friendRequestRespondRouteMatch && request.method === 'PATCH') {
    await handleRespondFriendRequest(
      request,
      response,
      Number(friendRequestRespondRouteMatch[1]),
      friendRequestRespondRouteMatch[2]
    );
    return;
  }

  if (friendRequestsRouteMatch && request.method === 'POST') {
    await handleCreateFriendRequest(request, response, Number(friendRequestsRouteMatch[1]));
    return;
  }

  sendJson(response, 404, { success: false, error: 'Not found' });
}

module.exports = { dispatch, sendJson };
