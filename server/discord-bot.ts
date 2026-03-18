/**
 * Discord Bot for 观星 GuanXing — discord.js v14 with slash commands.
 * Starts only if DISCORD_BOT_TOKEN is set.
 */
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
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
  console.log(`[DC] ${msg}`);
}

// ─── Slash Command Definitions ────────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName("fortune")
    .setDescription("每日运势 — 查看今日综合运势")
    .addStringOption(opt => opt.setName("birth_date").setDescription("出生日期 (YYYY-MM-DD)").setRequired(false)),
  new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("加密运势 — 五行 × 加密货币能量")
    .addStringOption(opt => opt.setName("token").setDescription("代币符号: BTC/ETH/SOL/BNB/TON").setRequired(false)),
  new SlashCommandBuilder()
    .setName("bazi")
    .setDescription("八字分析 — 四柱五行命理")
    .addStringOption(opt => opt.setName("birth_date").setDescription("出生日期 (YYYY-MM-DD)").setRequired(true))
    .addIntegerOption(opt => opt.setName("birth_hour").setDescription("出生时辰 (0-23)").setRequired(false).setMinValue(0).setMaxValue(23)),
  new SlashCommandBuilder()
    .setName("qiuqian")
    .setDescription("求签 — 观音灵签")
    .addStringOption(opt => opt.setName("category").setDescription("类别").setRequired(false)
      .addChoices(
        { name: "事业", value: "事业" },
        { name: "感情", value: "感情" },
        { name: "财运", value: "财运" },
        { name: "学业", value: "学业" },
        { name: "健康", value: "健康" },
      ))
    .addStringOption(opt => opt.setName("question").setDescription("你的问题").setRequired(false)),
  new SlashCommandBuilder()
    .setName("tarot")
    .setDescription("塔罗占卜 — 抽取塔罗牌")
    .addStringOption(opt => opt.setName("question").setDescription("你的问题").setRequired(false)),
  new SlashCommandBuilder()
    .setName("dream")
    .setDescription("解梦 — 周公解梦 × 心理分析")
    .addStringOption(opt => opt.setName("description").setDescription("梦境描述").setRequired(true)),
  new SlashCommandBuilder()
    .setName("almanac")
    .setDescription("老黄历 — 每日宜忌")
    .addStringOption(opt => opt.setName("date").setDescription("日期 (YYYY-MM-DD)").setRequired(false)),
  new SlashCommandBuilder()
    .setName("fengshui")
    .setDescription("风水分析 — 空间能量评估")
    .addStringOption(opt => opt.setName("space").setDescription("空间描述 (如: 客厅朝南)").setRequired(true)),
  new SlashCommandBuilder()
    .setName("gxhelp")
    .setDescription("查看观星所有命令"),
];

// ─── Embed Helpers ────────────────────────────────────────

const ELEMENT_COLORS: Record<string, number> = {
  金: 0xFFD700, // gold
  木: 0x2ECC71, // green
  水: 0x3498DB, // blue
  火: 0xE74C3C, // red
  土: 0xE67E22, // orange
};

function textToEmbed(title: string, text: string, color?: number): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(text.slice(0, 4000))
    .setColor(color ?? 0x9B59B6)
    .setFooter({ text: "观星 GuanXing — AI × 东方玄学" })
    .setTimestamp();
}

// ─── Command Handler ──────────────────────────────────────

async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = interaction.user.id;
  if (!checkBotRateLimit(`dc:${userId}`)) {
    await interaction.reply({ content: "⏳ 请稍等几秒再试", ephemeral: true });
    return;
  }

  const cmd = interaction.commandName;
  log(`Command: /${cmd} from ${interaction.user.tag}`);

  // Defer reply (ephemeral for personal readings)
  const ephemeral = ["fortune", "bazi", "tarot", "dream", "qiuqian"].includes(cmd);
  await interaction.deferReply({ ephemeral });

  try {
    let result: string;
    let embedColor = 0x9B59B6;
    let title = "观星";

    switch (cmd) {
      case "fortune": {
        title = "🌟 每日运势";
        const birthDate = interaction.options.getString("birth_date") || undefined;
        result = await handleFortune(birthDate);
        break;
      }
      case "crypto": {
        title = "🪙 加密运势";
        embedColor = 0xFFD700;
        const token = interaction.options.getString("token") || undefined;
        result = await handleCrypto(token);
        break;
      }
      case "bazi": {
        title = "🔮 八字分析";
        embedColor = 0xE74C3C;
        const birthDate = interaction.options.getString("birth_date")!;
        const birthHour = interaction.options.getInteger("birth_hour") ?? undefined;
        result = await handleBazi(birthDate, birthHour);
        break;
      }
      case "qiuqian": {
        title = "🎋 观音灵签";
        embedColor = 0x2ECC71;
        const category = interaction.options.getString("category") || undefined;
        const question = interaction.options.getString("question") || undefined;
        result = await handleQiuqian(category, question);
        break;
      }
      case "tarot": {
        title = "🃏 塔罗占卜";
        embedColor = 0x9B59B6;
        const question = interaction.options.getString("question") || undefined;
        result = await handleTarot(question);
        break;
      }
      case "dream": {
        title = "🌙 解梦";
        embedColor = 0x3498DB;
        const description = interaction.options.getString("description")!;
        result = await handleDream(description);
        break;
      }
      case "almanac": {
        title = "📅 老黄历";
        embedColor = 0xE67E22;
        const date = interaction.options.getString("date") || undefined;
        result = await handleAlmanac(date);
        break;
      }
      case "fengshui": {
        title = "🏠 风水分析";
        embedColor = 0x2ECC71;
        const space = interaction.options.getString("space")!;
        result = await handleFengshui(space);
        break;
      }
      case "gxhelp": {
        title = "❓ 观星帮助";
        result = handleHelp();
        break;
      }
      default:
        result = "未知命令";
    }

    // Strip markdown bold (*) for embed — Discord uses ** for bold
    const cleanResult = result.replace(/\*([^*]+)\*/g, "**$1**");
    const embed = textToEmbed(title, cleanResult, embedColor);
    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    log(`Error handling /${cmd}: ${err.message}`);
    await interaction.editReply({ content: "❌ 命令执行失败，请稍后再试" }).catch(() => {});
  }
}

// ─── Register Slash Commands ──────────────────────────────

async function registerSlashCommands(token: string, clientId: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    log("Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map(c => c.toJSON()) },
    );
    log("Slash commands registered");
  } catch (err: any) {
    log(`Failed to register commands: ${err.message}`);
  }
}

// ─── Start Bot ────────────────────────────────────────────

export async function startDiscordBot(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    log("No DISCORD_BOT_TOKEN, skipping");
    return;
  }

  const clientId = process.env.DISCORD_CLIENT_ID;

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", async () => {
    log(`Discord bot started as ${client.user?.tag}`);
    if (clientId) {
      await registerSlashCommands(token, clientId);
    } else {
      log("No DISCORD_CLIENT_ID, skipping slash command registration (commands may already be registered)");
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleInteraction(interaction);
    } catch (err: any) {
      log(`Interaction error: ${err.message}`);
    }
  });

  client.on("error", (err) => {
    log(`Client error: ${err.message}`);
  });

  await client.login(token);
}
