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

## Структура и архитектура

Подробное описание паттерна организации кода, слоёв и дерева папок: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

Кратко:

- **`src/`** — React (CRA): `pages/` (экраны), `components/` (UI), `hooks/` (доменная логика), `api/` (базовый URL API), `navigation/` (разбор URL), `utils/`, `constants/`, `assets/`, `styles/`.
- **`public/`** — статика CRA.
- **`server/`** — Node: `index.js` (HTTP), `routes.js` (эндпоинты), `db.js`, `config.js`, при необходимости `sql/`, `uploads/`.
