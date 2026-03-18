/**
 * Telegram Bot for 观星 GuanXing — polling mode.
 * Starts only if TELEGRAM_BOT_TOKEN is set.
 */
import { Bot, InlineKeyboard, type Context } from "grammy";
import {
  checkBotRateLimit,
  handleFortune,
  handleCrypto,
  handleBazi,
  handleQiuqian,
  handleTarot,
  handleDream,
  handleAlmanac,
  handleFengshui,
  handleHelp,
} from "./bot-commands";

function log(msg: string) {
  console.log(`[TG] ${msg}`);
}

async function sendLong(ctx: Context, text: string) {
  // Telegram max message length is 4096; split if needed
  const MAX = 4000;
  if (text.length <= MAX) {
    await ctx.reply(text, { parse_mode: "Markdown" }).catch(() =>
      ctx.reply(text) // fallback without markdown if it fails
    );
    return;
  }
  for (let i = 0; i < text.length; i += MAX) {
    const chunk = text.slice(i, i + MAX);
    await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(() =>
      ctx.reply(chunk)
    );
  }
}

export async function startTelegramBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    log("No TELEGRAM_BOT_TOKEN, skipping");
    return;
  }

  const bot = new Bot(token);

  // ─── /start ──────────────────────────────────────
  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🔮 运势", "cmd_fortune").text("🪙 加密运势", "cmd_crypto").row()
      .text("📋 八字", "cmd_bazi").text("🎋 求签", "cmd_qiuqian").row()
      .text("🃏 塔罗", "cmd_tarot").text("🌙 解梦", "cmd_dream").row()
      .text("📅 黄历", "cmd_almanac").text("🏠 风水", "cmd_fengshui").row()
      .text("❓ 帮助", "cmd_help");

    await ctx.reply(
      `🌟 *观星 GuanXing* — AI 情感陪伴 × 东方玄学

欢迎来到观星！我可以为你提供:

🔮 每日运势 · 🪙 加密运势
📋 八字分析 · 🎋 观音灵签
🃏 塔罗占卜 · 🌙 周公解梦
📅 老黄历 · 🏠 风水分析

点击下方按钮或使用 /help 查看详细命令~`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  });

  // ─── Callback Queries (inline buttons) ──────────
  bot.callbackQuery("cmd_fortune", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("请发送 /fortune 或 /fortune YYYY-MM-DD (附出生日期)");
  });
  bot.callbackQuery("cmd_crypto", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const result = await handleCrypto();
    await sendLong(ctx, result);
  });
  bot.callbackQuery("cmd_bazi", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("请发送 /bazi YYYY-MM-DD [时辰0-23]\n例如: /bazi 1990-05-15 14");
  });
  bot.callbackQuery("cmd_qiuqian", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const result = await handleQiuqian();
    await sendLong(ctx, result);
  });
  bot.callbackQuery("cmd_tarot", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const result = await handleTarot();
    await sendLong(ctx, result);
  });
  bot.callbackQuery("cmd_dream", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("请发送 /dream 加上你的梦境描述\n例如: /dream 梦见在天上飞");
  });
  bot.callbackQuery("cmd_almanac", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const result = await handleAlmanac();
    await sendLong(ctx, result);
  });
  bot.callbackQuery("cmd_fengshui", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("请发送 /fengshui 加上空间描述\n例如: /fengshui 客厅朝南");
  });
  bot.callbackQuery("cmd_help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendLong(ctx, handleHelp());
  });

  // ─── Commands ────────────────────────────────────
  bot.command("help", async (ctx) => {
    await sendLong(ctx, handleHelp());
  });

  bot.command("fortune", async (ctx) => {
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const args = ctx.match?.trim();
    await ctx.reply("⏳ 正在为你计算运势...");
    const result = await handleFortune(args || undefined);
    await sendLong(ctx, result);
  });

  bot.command("crypto", async (ctx) => {
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const args = ctx.match?.trim();
    const result = await handleCrypto(args || undefined);
    await sendLong(ctx, result);
  });

  bot.command("bazi", async (ctx) => {
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const args = ctx.match?.trim().split(/\s+/) || [];
    if (!args[0]) {
      await ctx.reply("请提供出生日期，例如: /bazi 1990-05-15 14");
      return;
    }
    await ctx.reply("⏳ 正在分析八字...");
    const result = await handleBazi(args[0], args[1] ? parseInt(args[1]) : undefined);
    await sendLong(ctx, result);
  });

  bot.command("qiuqian", async (ctx) => {
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const args = ctx.match?.trim() || "";
    const categories = ["事业", "感情", "财运", "学业", "健康"];
    let category: string | undefined;
    let question: string | undefined;
    for (const cat of categories) {
      if (args.startsWith(cat)) {
        category = cat;
        question = args.slice(cat.length).trim() || undefined;
        break;
      }
    }
    if (!category) question = args || undefined;
    await ctx.reply("🎋 摇签中...");
    const result = await handleQiuqian(category, question);
    await sendLong(ctx, result);
  });

  bot.command("tarot", async (ctx) => {
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const question = ctx.match?.trim() || undefined;
    await ctx.reply("🃏 正在洗牌...");
    const result = await handleTarot(question);
    await sendLong(ctx, result);
  });

  bot.command("dream", async (ctx) => {
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const dreamText = ctx.match?.trim();
    if (!dreamText) {
      await ctx.reply("请描述你的梦境，例如: /dream 梦见在天上飞");
      return;
    }
    await ctx.reply("🌙 正在解梦...");
    const result = await handleDream(dreamText);
    await sendLong(ctx, result);
  });

  bot.command("almanac", async (ctx) => {
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const dateStr = ctx.match?.trim() || undefined;
    const result = await handleAlmanac(dateStr);
    await sendLong(ctx, result);
  });

  bot.command("fengshui", async (ctx) => {
    const userId = String(ctx.from?.id || "anon");
    if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
    const input = ctx.match?.trim();
    if (!input) {
      await ctx.reply("请描述空间，例如: /fengshui 客厅朝南");
      return;
    }
    await ctx.reply("🏠 正在分析风水...");
    const result = await handleFengshui(input);
    await sendLong(ctx, result);
  });

  // ─── Natural Language Triggers ───────────────────
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return; // Skip commands

    const userId = String(ctx.from?.id || "anon");
    const triggers: Record<string, () => Promise<string>> = {
      运势: () => handleFortune(),
      八字: () => { return Promise.resolve("请使用 /bazi YYYY-MM-DD 查看八字分析"); },
      求签: () => handleQiuqian(),
      塔罗: () => handleTarot(),
      解梦: () => handleDream(text.replace(/解梦/g, "").trim()),
      黄历: () => handleAlmanac(),
      风水: () => handleFengshui(text.replace(/风水/g, "").trim()),
      加密: () => handleCrypto(),
    };

    for (const [keyword, handler] of Object.entries(triggers)) {
      if (text.includes(keyword)) {
        if (!checkBotRateLimit(userId)) { await ctx.reply("⏳ 请稍等几秒再试"); return; }
        const result = await handler();
        await sendLong(ctx, result);
        return;
      }
    }
  });

  // ─── Error Handling ──────────────────────────────
  bot.catch((err) => {
    log(`Error: ${err.message}`);
  });

  // ─── Start Polling ───────────────────────────────
  bot.start({
    onStart: () => log("Telegram bot started"),
  });
  log("Telegram bot polling started");
}
