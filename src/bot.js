const { Telegraf, Markup } = require('telegraf');
const config = require('./config');

module.exports = function startBot() {
  if (!config.botToken) return console.warn('BOT_TOKEN not set - bot disabled');
  const bot = new Telegraf(config.botToken);
  bot.start(ctx => ctx.reply('እንኳን ደህና መጡ! 📚\nየመጻሕፍት ማህደራችንን ለመክፈት ከታች ይጫኑ።',
    Markup.inlineKeyboard([Markup.button.webApp('📖 H Book Store ክፈት', config.publicUrl)])));
  bot.telegram.setChatMenuButton({ menuButton: { type: 'web_app', text: 'Library', web_app: { url: config.publicUrl } } })
    .catch(e => console.warn('menu button:', e.message));
  bot.launch().catch(e => console.error('bot error:', e.message));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};
