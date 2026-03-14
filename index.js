require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const cron = require('node-cron');
const { checkAllFeeds } = require('./feedChecker');
const { loadSeen, saveSeen } = require('./storage');
const { registerCommands } = require('./commands');
const { startServer } = require('./server');
const { log } = require('./logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

client.commands = new Collection();

client.once('ready', async () => {
  log(`Bot online as ${client.user.tag}`);
  await registerCommands(client);
  await loadSeen();
  log('Seeding existing articles...');
  await checkAllFeeds(client, true);
  log('Seeding complete. Now watching for NEW announcements...');

  cron.schedule('*/10 * * * *', async () => {
    log('Checking feeds...');
    await checkAllFeeds(client, false);
    await saveSeen();
  });

  cron.schedule('0 * * * *', saveSeen);

  // Start the website
  startServer(client);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (err) {
    log(`Command error: ${err.message}`, 'error');
    const msg = { content: 'Something went wrong.', ephemeral: true };
    interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
  }
});

client.login(process.env.DISCORD_TOKEN);
