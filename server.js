const express = require('express');
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getConfig } = require('./config');
const { log } = require('./logger');

function startServer(client) {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  // POST /announce — receives message + optional image from website
  app.post('/announce', async (req, res) => {
    const { message, image, mimeType } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const config = getConfig();
    const channelId = config.channelId || process.env.CHANNEL_ID;
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
      return res.status(500).json({ error: 'Discord channel not configured. Use /setchannel in Discord.' });
    }

    try {
      const embed = new EmbedBuilder()
        .setDescription(message.trim())
        .setColor(0xe8ff47)
        .setTimestamp();

      const payload = { embeds: [embed] };

      // Attach image if provided
      if (image && mimeType) {
        const ext = mimeType.split('/')[1] || 'png';
        const buffer = Buffer.from(image, 'base64');
        const attachment = new AttachmentBuilder(buffer, { name: `announcement.${ext}` });
        embed.setImage(`attachment://announcement.${ext}`);
        payload.files = [attachment];
      }

      // Ping role if set
      if (config.pingRoleId) {
        payload.content = `<@&${config.pingRoleId}>`;
      }

      await channel.send(payload);
      log(`Manual announcement sent via website.`);
      res.json({ ok: true });
    } catch (err) {
      log(`Failed to send announcement: ${err.message}`, 'error');
      res.status(500).json({ error: 'Failed to send to Discord.' });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => log(`Web server running on port ${PORT}`));
}

module.exports = { startServer };
