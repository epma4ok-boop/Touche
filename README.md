# Touché — Telegram Mini App

Задания для пар на вечер / Evening tasks for couples.

## Стек / Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Canvas API (анимации без библиотек)
- WebAudio API (звуки без файлов)

## Категории

| Категория | Доступ | Stars |
|---|---|---|
| Комплименты | 1 в день бесплатно | 1 ★ |
| Нежность | 1 в день бесплатно | 1 ★ |
| Желание | 1 в день бесплатно | 1 ★ |
| Страсть | 1 в день + 18+ | 2 ★ |
| Хард | 1 в день + 18+ | 2 ★ |

## Запуск локально

```bash
npm install
npm run dev
```

## Деплой на Vercel

1. Залить на GitHub
2. Подключить репо к Vercel
3. Vercel сам определит Vite → `npm run build` → `dist/`

## Telegram Bot подключение

1. Создай бота через @BotFather
2. Включи Mini Apps: `/newapp` или `/myapps`
3. Пропиши URL приложения (Vercel домен)
4. Измени `BOT_USERNAME` в `src/pages/Home.tsx`

## API (необязательно для MVP)

Папка `api/` — Vercel Serverless Functions для Telegram Stars:
- `POST /api/payments/invoice` — создаёт инвойс для оплаты Stars
- `POST /api/payments/webhook` — обрабатывает успешную оплату

Для работы Stars нужно:
1. `TELEGRAM_BOT_TOKEN` в переменных окружения Vercel
2. Настроить вебхук бота

## Структура

```
src/
├── App.tsx           # Роутинг фаз: splash → lang → home → category
├── components/
│   ├── SplashScreen.tsx    # Анимированный сплэш
│   ├── LanguageSelect.tsx  # Выбор языка
│   ├── FlameCanvas.tsx     # Canvas анимация пламени
│   └── HistoryPanel.tsx    # История заданий
├── data/
│   ├── i18n.ts     # Переводы + конфиг категорий
│   └── tasks.ts    # Задания (RU + EN)
├── hooks/
│   └── useSensualSound.ts  # WebAudio звуки
└── pages/
    ├── Home.tsx            # Главный экран с 5 орбами
    └── CategoryScreen.tsx  # Экран категории с пламенем
```
