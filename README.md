# WISHLY (gift)

Фронтенд: React (Create React App). Бэкенд: Node.js без фреймворков, `mysql2`.

## Запуск

```bash
npm install
npm start
```

Открой [http://localhost:3000](http://localhost:3000). Запросы с фронта к `/api` проксируются на порт 5000.

API отдельно:

```bash
npm run server
```

Перед этим в папке `server` создай файл `.env` по образцу `.env.example` (пароль MySQL и при необходимости хост/база).

## Структура

- `src/` — React: `App.js`, `components/MainLayout.js`, `styles/global.css`
- `public/` — статика CRA
- `server/` — `index.js` (HTTP), `routes.js` (эндпоинты), `db.js`, `config.js`
