/**
 * Maktabim - Ota-onalar Telegram Boti Polling Skripti
 * Bu skript Telegramdan yangi xabarlarni olib, /api/telegram/parent-webhook endpointiga uzatadi.
 * Ishga tushirish: node scripts/parent-bot.mjs
 */

const BOT_TOKEN =
  process.env.TELEGRAM_PARENT_BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  '9204379482:AAG52nMv0V3GaOxNrij5a-JgWaHRDEQkYXo';
const WEBHOOK_URL = process.env.BOT_INTERNAL_WEBHOOK || 'http://localhost:3000/api/telegram/parent-webhook';

console.log('🤖 Maktabim Ota-onalar Telegram Boti ishga tushmoqda...');
console.log(`📡 Endpoint: ${WEBHOOK_URL}`);

let offset = 0;
let isRunning = true;

async function deleteExistingWebhook() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    const data = await res.json();
    if (data.ok) {
      console.log('✅ Webhook tozalandi, Long Polling ga ulanmoqda...');
    }
  } catch (e) {
    console.error('Webhook o‘chirishda xatolik:', e.message);
  }
}

async function pollUpdates() {
  while (isRunning) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=25`);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          // Webhook endpointga uzatish
          try {
            await fetch(WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update),
            });
          } catch (forwardErr) {
            console.error('❌ Xabarni serverga uzatishda xatolik:', forwardErr.message);
          }
        }
      } else if (!data.ok) {
        console.warn('⚠️ Telegram API javobi:', data.description);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error('⚠️ Tarmoq xatoligi (qayta ulanmoqda):', err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Bot to‘xtatilmoqda...');
  isRunning = false;
  process.exit(0);
});

async function start() {
  await deleteExistingWebhook();
  console.log('🚀 Telegram Bot tayyor va xabarlarni tinglamoqda!');
  pollUpdates();
}

start();
