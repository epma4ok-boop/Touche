# Touché — Telegram Mini App

Задания для личного режима или вечера вдвоём / Evening tasks for personal or shared play.

## Режимы

- **Личный режим** — прямой выбор пяти категорий без обязательного подключения пары.
- **Вместе** — те же категории, компактный статус «для двоих», локальный индекс близости и сценарии.
- Подключение пары необязательно для выбора категорий; синхронизация статуса пары работает только после подключения.
- Выбранный режим сохраняется в `localStorage`. После подключения пары приложение автоматически переключается в режим «Вместе».

## Стек / Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Canvas API (анимации без библиотек)
- WebAudio API (звуки без файлов)

## Категории

| Категория | Доступ | Stars |
|---|---|---|
| Комплименты | 3 задания в день бесплатно | Premium / Stars |
| Нежность | 3 задания в день бесплатно | Premium / Stars |
| Желание | 3 задания в день бесплатно | Premium / Stars |
| Страсть | 3 задания в день + 18+ | Premium / Stars |
| Хард | 3 задания в день + 18+ | Premium / Stars |

Лимит считается отдельно для каждой категории и сбрасывается раз в день. Индекс близости хранится локально; без серверной синхронизации он не является общим показателем пары.

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
│   ├── IntimacyIndex.tsx   # Компактный локальный прогресс режима «Вместе»
│   └── HistoryPanel.tsx    # История заданий
├── data/
│   ├── i18n.ts     # Переводы + конфиг категорий
│   └── tasks.ts    # Задания (RU + EN)
├── hooks/
│   └── useSensualSound.ts  # WebAudio звуки
└── pages/
    ├── Home.tsx            # Переключатель режимов и категории
    └── CategoryScreen.tsx  # Экран задания с контекстом режима
```
