# MoneyApp

Локальное десктоп-приложение для учёта личных финансов (React + Tauri + SQLite).

## Установка

```bash
npm install
```

> Для сборки `.exe` также нужны [Rust](https://rustup.rs/) и [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (обычно уже есть в Windows 10/11).

## Сборка Windows `.exe`

```bash
npm run tauri:build
```

Готовый установщик и `finance.db` (создаётся при первом запуске) будут рядом с исполняемым файлом в `src-tauri/target/release/bundle/`.

## Разработка

```bash
npm run tauri:dev
```

Данные хранятся в `finance.db` рядом с `.exe`. Каждый локальный профиль изолирован по `user_id`.
