const fs = require('fs');
const path = require('path');

const environmentFilePath = path.join(__dirname, '.env');

function parseLine(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('#')) return null;

  const equalsSignPosition = trimmedLine.indexOf('=');
  if (equalsSignPosition <= 0) return null;

  const key = trimmedLine.slice(0, equalsSignPosition).trim();
  let value = trimmedLine.slice(equalsSignPosition + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnv() {
  try {
    if (!fs.existsSync(environmentFilePath)) return;

    const fileContent = fs.readFileSync(environmentFilePath, 'utf8');
    for (const line of fileContent.split(/\r?\n/)) {
      const parsedLine = parseLine(line);
      if (parsedLine && process.env[parsedLine.key] === undefined) {
        process.env[parsedLine.key] = parsedLine.value;
      }
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

module.exports = {
  port: Number(process.env.PORT) || 5000,
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Lerochka123',
    database: process.env.MYSQL_DATABASE || 'giftproject',
  },
};
