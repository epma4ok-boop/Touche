# Touché Tarot — localized card meanings

Apply this patch to the Touché project that already has the Tarot feature installed.

Extract at the project root and preserve paths:

- Replace `src/data/tarot.ts`
- Add `src/data/tarot-translations.json`
- Replace `src/pages/TarotScreen.tsx`

The 23 original Russian card names, all 69 original descriptions, image mapping, and reading sequence remain unchanged. The 69 meanings now have English, Hindi, Portuguese, and Spanish translations selected by the existing interface language. Card names and the final author question stay in Russian; the UI says so. The app's previous warning that all card texts are Russian has been removed.

No dependency, database, bot, subscription, or quota changes are needed. Installing these files does not update the separately hosted Telegram app; build and publish the project using its usual release process.
