const express = require('express');
const crypto = require('crypto');
const line = require('@line/bot-sdk');

// You may need to adjust these imports to your project structure
const logger = console; // Replace with your logger if available
// const { sequelize, Login_History } = require('../models'); // Uncomment and adjust if using Sequelize
// const redis = require('../redis'); // Uncomment and adjust if using Redis

const router = express.Router();

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const channelSecret = process.env.LINE_SECRET_TOKEN; // Use your secret token

const client = new line.Client({
  channelAccessToken,
  channelSecret,
});

// Use express.raw to get the raw body for signature validation
router.use(express.raw({ type: '*/*' }));

function isValidSignature(signature, body, secret) {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

router.post('/', async (req, res) => {
  const signature = req.headers['x-line-signature'];

  if (!isValidSignature(signature, req.body, channelSecret)) {
    logger.warn('❌ Invalid LINE signature');
    return res.sendStatus(403);
  }

  res.sendStatus(200); // Respond immediately to avoid timeout

  let body;
  try {
    body = JSON.parse(req.body.toString());
  } catch (err) {
    logger.error('❌ Failed to parse body:', err);
    return;
  }

  const events = body.events;
  if (!events || events.length === 0) return;

  processEvents(events).catch(err => {
    logger.error('🚨 Error in processing LINE events:', err);
  });
});

async function safeReplyMessage(replyToken, message) {
  try {
    await client.replyMessage(replyToken, message);
  } catch (err) {
    logger.error('❌ Failed to reply message:', err);
  }
}

async function processEvents(events) {
  // const t = await sequelize.transaction(); // Uncomment if using Sequelize transactions
  try {
    for (const event of events) {
      const userId = event?.source?.userId;
      const msg = event?.message?.text?.trim()?.toLowerCase();

      if (!userId || !event.message || event.message.type !== 'text') {
        logger.warn('⚠️ Event missing userId or text message');
        continue;
      }

      // Optional: ป้องกัน spam login
      // const cooldownKey = `login_cooldown:${userId}`;
      // const isCooldown = await redis.get(cooldownKey);
      // if (isCooldown) {
      //   logger.info(`⏳ Skipping spam login by ${userId}`);
      //   continue;
      // }

      if (msg === 'login') {
        // const existingRecord = await Login_History.findOne({
        //   where: { line_user_id: userId },
        //   transaction: t,
        // });

        // if (!existingRecord) {
          const linkText = `โปรดยืนยันตัวตน! : ${process.env.APP_LINE_SONY_URL}/?line_user_id=${userId}`;
          logger.info(`📤 ส่งลิงก์ยืนยันให้ LINE ID: ${userId}`);
          await safeReplyMessage(event.replyToken, {
            type: 'text',
            text: linkText,
          });

          // await redis.setex(cooldownKey, 60, '1'); // Set cooldown 60 seconds
        // } else {
        //   logger.info(`ℹ️ ยืนยันซ้ำ LINE ID: ${userId}`);
        //   await safeReplyMessage(event.replyToken, {
        //     type: 'text',
        //     text: 'คุณได้ยืนยันตัวตนแล้ว!',
        //   });
        // }
      }
    }

    // await t.commit(); // Uncomment if using Sequelize transactions
  } catch (err) {
    // await t.rollback(); // Uncomment if using Sequelize transactions
    logger.error('❌ Failed to handle LINE events:', err);
  }
}

module.exports = router;