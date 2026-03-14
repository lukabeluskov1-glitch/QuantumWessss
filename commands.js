const { REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, updateConfig } = require('./config');
const { checkAllFeeds } = require('./feedChecker');
const { FEEDS } = require('./sources');
const { log } = require('./logger');

const commandDefs = [
  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set the channel where announcements are posted')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to post in').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show bot status and settings'),

  new SlashCommandBuilder()
    .setName('check')
    .setDescription('Manually trigger a feed check right now')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('sources')
    .setDescription('List all configured news sources'),

  new SlashCommandBuilder()
    .setName('togglecategory')
    .setDescription('Enable or disable a news category')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Category to toggle')
        .setRequired(true)
        .addChoices(
          { name: 'Anime',        value: 'anime'      },
          { name: 'Manga',        value: 'manga'      },
          { name: 'Light Novels', value: 'lightnovel' },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('setpingrole')
    .setDescription('Set a role to ping on new announcements (leave empty to disable)')
    .addRoleOption(opt =>
      opt.setName('role').setDescription('Role to ping')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),
];

const handlers = {

  async setchannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    updateConfig({ channelId: channel.id });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x22c55e)
        .setTitle('Channel Set')
        .setDescription(`Announcements will now be posted in ${channel}`)],
      ephemeral: true,
    });
    log(`Channel set to #${channel.name} (${channel.id})`);
  },

  async status(interaction) {
    const config   = getConfig();
    const channel  = config.channelId ? `<#${config.channelId}>` : 'Not set — use /setchannel';
    const pingRole = config.pingRoleId ? `<@&${config.pingRoleId}>` : 'None';
    const disabled = config.disabledCategories?.length ? config.disabledCategories.join(', ') : 'None (all active)';
    const active   = FEEDS.filter(f => !config.disabledCategories?.includes(f.category)).length;

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x6366f1)
        .setTitle('Announcement Bot — Status')
        .addFields(
          { name: 'Channel',             value: channel,            inline: true },
          { name: 'Ping Role',           value: pingRole,           inline: true },
          { name: 'Active Sources',      value: `${active} feeds`,  inline: true },
          { name: 'Disabled Categories', value: disabled,           inline: false },
          { name: 'Check Interval',      value: 'Every 10 minutes', inline: true },
        ).setTimestamp()],
      ephemeral: true,
    });
  },

  async check(interaction) {
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('Checking all feeds now...')],
      ephemeral: true,
    });
    await checkAllFeeds(interaction.client, false);
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x22c55e).setDescription('Feed check complete.')],
    });
  },

  async sources(interaction) {
    const config = getConfig();
    const lines  = FEEDS.map(f => {
      const off = config.disabledCategories?.includes(f.category);
      return `**${f.name}** — \`${f.category}\` — ${off ? 'off' : 'active'}`;
    });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x3b82f6)
        .setTitle('News Sources')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Use /togglecategory to enable or disable categories' })],
      ephemeral: true,
    });
  },

  async togglecategory(interaction) {
    const category   = interaction.options.getString('category');
    const config     = getConfig();
    const disabled   = config.disabledCategories || [];
    const turningOff = !disabled.includes(category);
    const newDisabled = turningOff ? [...disabled, category] : disabled.filter(c => c !== category);
    updateConfig({ disabledCategories: newDisabled });

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(turningOff ? 0xef4444 : 0x22c55e)
        .setTitle(`${turningOff ? 'Disabled' : 'Enabled'}: ${category}`)
        .setDescription(`The **${category}** category has been ${turningOff ? 'disabled' : 'enabled'}.`)],
      ephemeral: true,
    });
  },

  async setpingrole(interaction) {
    const role = interaction.options.getRole('role');
    updateConfig({ pingRoleId: role?.id || null });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x22c55e)
        .setTitle('Ping Role Updated')
        .setDescription(role ? `I'll ping ${role} for new announcements.` : 'Ping role cleared.')],
      ephemeral: true,
    });
  },

  async help(interaction) {
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x8b5cf6)
        .setTitle('Commands')
        .addFields(
          { name: '/setchannel',     value: 'Set where announcements are posted',          inline: false },
          { name: '/status',         value: 'View current settings and active sources',     inline: false },
          { name: '/check',          value: 'Manually trigger a feed check right now',      inline: false },
          { name: '/sources',        value: 'List all news sources and their status',       inline: false },
          { name: '/togglecategory', value: 'Enable or disable anime, manga, light novels', inline: false },
          { name: '/setpingrole',    value: 'Ping a role when announcements arrive',        inline: false },
          { name: '/help',           value: 'Show this message',                            inline: false },
        )
        .setFooter({ text: 'Checks every 10 minutes automatically' })],
      ephemeral: true,
    });
  },
};

async function registerCommands(client) {
  client.commands.clear();
  for (const def of commandDefs) {
    client.commands.set(def.name, { data: def, execute: handlers[def.name] });
  }
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandDefs.map(c => c.toJSON()) });
    log(`Registered ${commandDefs.length} slash commands.`);
  } catch (err) {
    log(`Command registration failed: ${err.message}`, 'error');
  }
}

module.exports = { registerCommands };
