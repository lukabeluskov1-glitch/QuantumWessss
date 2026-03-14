const RSSParser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');
const { FEEDS } = require('./sources');
const { hasSeen, markSeen } = require('./storage');
const { getConfig } = require('./config');
const { log } = require('./logger');

const parser = new RSSParser({
  timeout: 10000,
  headers: { 'User-Agent': 'AnnouncementBot/1.0' },
  customFields: {
    item: [
      ['media:content',   'mediaContent',   { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['media:group',     'mediaGroup',     { keepArray: false }],
      ['enclosure',       'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

function extractImage(item) {
  const mc = item.mediaContent;
  if (mc) {
    if (typeof mc === 'string' && mc.startsWith('http')) return mc;
    if (mc?.$?.url) return mc.$.url;
    if (mc?.url)    return mc.url;
  }
  const mt = item.mediaThumbnail;
  if (mt?.$?.url) return mt.$.url;
  if (mt?.url)    return mt.url;

  const mg = item.mediaGroup;
  if (mg?.['media:content']?.[0]?.$?.url)   return mg['media:content'][0].$.url;
  if (mg?.['media:thumbnail']?.[0]?.$?.url) return mg['media:thumbnail'][0].$.url;

  if (item.enclosure?.url && /\.(jpe?g|png|gif|webp)/i.test(item.enclosure.url))
    return item.enclosure.url;

  if (item.itunes?.image) return item.itunes.image;

  const html = item.contentEncoded || item.content || item.summary || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m?.[1]?.startsWith('http')) return m[1];

  return null;
}

function stripHtml(raw = '') {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function isSequel(title) {
  return [
    /\bseason\s*\d+/i, /\bs\d+\b/i, /\b2nd\s+season/i, /\b3rd\s+season/i,
    /\bpart\s*\d+/i, /\bcour\s*\d+/i, /\bsequel\b/i, /\bii\b/i, /\biii\b/i,
  ].some(r => r.test(title));
}

const DATE_PATTERNS = [
  /\b(premieres?|airing|releasing?|debuts?|launches?|scheduled(?:\s+for)?)\s+(?:in\s+)?([A-Za-z]+\s+\d{4})/i,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i,
  /\b(Spring|Summer|Fall|Autumn|Winter)\s+202[6-9]\b/i,
  /\bQ[1-4]\s+202[6-9]\b/i,
  /\bin\s+(202[6-9])\b/i,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i,
  /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i,
];

function extractDate(text) {
  for (const pattern of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (m) return m[2] || m[1] || m[0];
  }
  return null;
}

function extractShowName(rawTitle) {
  let t = stripHtml(rawTitle);
  t = t
    .replace(/\s+(gets?|receives?|announces?|confirms?|reveals?)\b.*/i, '')
    .replace(/\s+(season\s*\d+|s\d+|sequel|part\s*\d+|cour\s*\d+|2nd season|3rd season|ii|iii)\b.*/i, '')
    .replace(/\s+anime\s*(adaptation|series|tv)?\s*$/i, '')
    .replace(/\s+manga\s*(adaptation|series)?\s*$/i, '')
    .replace(/\s+anime\b/i, '')
    .trim();
  return t || rawTitle.trim();
}

function getAnnouncementType(title) {
  const t = title.toLowerCase();
  if (/\bsequel\b|\bseason\s*\d+|\bs\d+\b|\b2nd\s+season|\b3rd\s+season|\bpart\s*\d+/.test(t)) return 'Sequel Announced';
  if (/\badaptation\b/.test(t)) return 'Adaptation Announced';
  return 'Officially Announced';
}

const ANNOUNCEMENT_SIGNALS = [
  /\bannounced?\b/i, /\bconfirmed?\b/i, /\brevealed?\b/i,
  /\bgets?\s+(a\s+)?(new\s+)?(anime|season|sequel|adaptation|series|manga|light novel)\b/i,
  /\bgreen.?lit\b/i, /\bpremiere/i, /\bairing\b/i,
  /\badaptation\b/i, /\bsequel\b/i,
  /\bnew\s+anime\b/i, /\bnew\s+series\b/i, /\bseason\s*\d+\b/i,
];

function isAnnouncement(title, description) {
  const combined = `${title} ${description}`;
  return ANNOUNCEMENT_SIGNALS.some(r => r.test(combined));
}

function buildEmbed(item, feed) {
  const rawTitle   = item.title || '';
  const rawContent = stripHtml(item.contentEncoded || item.content || item.summary || item.contentSnippet || '');

  const showName         = extractShowName(rawTitle);
  const sequel           = isSequel(rawTitle);
  const scheduleDate     = extractDate(rawContent) || extractDate(rawTitle);
  const announcementType = getAnnouncementType(rawTitle);
  const image            = extractImage(item);

  const displayName = sequel ? `**${showName} Sequel**` : `**${showName}**`;
  let message = `${displayName} has been officially announced`;
  if (scheduleDate) message += ` and is scheduled for **${scheduleDate}**`;
  message += '.';

  const pubDate = item.pubDate || item.isoDate ? new Date(item.pubDate || item.isoDate) : new Date();

  const categoryLabel = feed.category === 'lightnovel' ? 'Light Novel'
    : feed.category.charAt(0).toUpperCase() + feed.category.slice(1);

  const embed = new EmbedBuilder()
    .setColor(feed.color)
    .setTitle(`${announcementType} — ${showName}${sequel ? ' (Sequel)' : ''}`)
    .setDescription(message)
    .addFields(
      { name: 'Category', value: categoryLabel, inline: true },
    )
    .setTimestamp(pubDate)
    .setFooter({ text: pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });

  if (item.link) embed.setURL(item.link);
  if (image)     embed.setImage(image);

  return embed;
}

async function checkFeed(feed, client, seedMode) {
  try {
    const parsed  = await parser.parseURL(feed.url);
    const items   = parsed.items.slice(0, 20);
    const config  = getConfig();
    const channel = client.channels.cache.get(config.channelId || process.env.CHANNEL_ID);

    if (!channel && !seedMode) {
      log(`Channel not found. Use /setchannel.`, 'warn');
      return;
    }

    for (const item of items) {
      const id = item.guid || item.link || item.title;
      if (!id) continue;
      if (hasSeen(id)) continue;
      markSeen(id);
      if (seedMode) continue;

      const rawTitle   = item.title || '';
      const rawContent = stripHtml(item.contentEncoded || item.content || item.summary || item.contentSnippet || '');
      if (!isAnnouncement(rawTitle, rawContent)) continue;

      const embed    = buildEmbed(item, feed);
      const pingRole = config.pingRoleId ? `<@&${config.pingRoleId}>` : undefined;
      await channel.send({ content: pingRole, embeds: [embed] });
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (err) {
    log(`Failed "${feed.name}": ${err.message}`, 'error');
  }
}

async function checkAllFeeds(client, seedMode = false) {
  const config = getConfig();
  const feeds  = FEEDS.filter(f => !config.disabledCategories?.includes(f.category));
  for (const feed of feeds) {
    await checkFeed(feed, client, seedMode);
  }
}

module.exports = { checkAllFeeds };
