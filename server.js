// ====================
// OJOLXPROGRAMMER Live Server
// TikTok Chat + Gift + Saweria Webhook
// ====================

const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const { WebcastPushConnection } = require('tiktok-live-connector');

// ====================
// Konfigurasi
// ====================
const app = express();
const PORT_HTTP = 3000;
const PORT_WS = 8080;
const TIKTOK_USERNAME = 'ojolxprogrammer2'; // ojolxprogrammer2 , catscript03 Tanpa "@"

// ====================
// Data Utama
// ====================
let allComments = [];
let totalDonations = 0;
let giftSenders = {};
let saweriaDonors = [];

// ====================
// Middleware
// ====================
app.use(express.json());
app.use(express.static('frontend')); // Serve file HTML/JS/CSS

// ====================
// WebSocket Server
// ====================
const wss = new WebSocket.Server({ port: PORT_WS });
wss.on('connection', (ws) => {
  console.log('Client WebSocket terhubung');

  // Kirim data awal ke client
  ws.send(JSON.stringify({ type: 'history', data: allComments }));
  ws.send(JSON.stringify({ type: 'donation-total', data: totalDonations }));
  ws.send(JSON.stringify({ type: 'gift-senders', data: giftSenders }));
  ws.send(JSON.stringify({ type: 'saweria-donors', data: saweriaDonors }));
});

// Kirim broadcast ke semua client
function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// ====================
// TikTok Live Connection
// ====================
const tiktokLive = new WebcastPushConnection(TIKTOK_USERNAME);

(async () => {
  try {
    await tiktokLive.connect();
    console.log(`✅ Terhubung ke TikTok LIVE: @${TIKTOK_USERNAME}`);
  } catch (err) {
    console.error('❌ Gagal terhubung ke TikTok:', err);
  }
})();

// Chat Komentar TikTok
tiktokLive.on('chat', (data) => {
  const comment = {
    nickname: data.nickname,
    comment: data.comment,
    event: 'chat',
    timestamp: Date.now()
  };
  allComments.push(comment);
  broadcast({ type: 'new', data: comment });
  saveToFile();
});

// Follow TikTok
tiktokLive.on('follow', (data) => {
  const follow = {
    nickname: data.nickname,
    event: 'follow',
    timestamp: Date.now()
  };
  allComments.push(follow);
  broadcast({ type: 'follow', data: follow });
  saveToFile();
});

// Gift TikTok
tiktokLive.on('gift', (data) => {
  const gift = {
    nickname: data.nickname,
    giftName: data.giftName,
    repeatCount: data.repeatCount,
    event: 'gift',
    timestamp: Date.now()
  };

  // Update total donasi (bisa dihitung ulang nilainya per gift)
  totalDonations += data.repeatCount;

  // Catat pemberi gift
  if (!giftSenders[data.nickname]) giftSenders[data.nickname] = {};
  giftSenders[data.nickname][data.giftName] =
    (giftSenders[data.nickname][data.giftName] || 0) + data.repeatCount;

  allComments.push(gift);
  broadcast({ type: 'gift', data: gift });
  broadcast({ type: 'donation-total', data: totalDonations });
  broadcast({ type: 'gift-senders', data: giftSenders });

  saveToFile();
});

// ====================
// Saweria Webhook
// ====================
app.post('/saweria-webhook', (req, res) => {
  const donor = {
    nickname: req.body.name || 'Anonim',
    amount: req.body.amount || 0,
    event: 'saweria',
    timestamp: Date.now()
  };

  saweriaDonors.push(donor);
  totalDonations += 1;

  allComments.push(donor);
  broadcast({ type: 'saweria', data: donor });
  broadcast({ type: 'saweria-donors', data: saweriaDonors });
  broadcast({ type: 'donation-total', data: totalDonations });

  saveToFile();
  res.sendStatus(200);
});

// ====================
// Simpan ke File
// ====================
function saveToFile() {
  const data = {
    comments: allComments,
    total: totalDonations,
    giftSenders,
    saweriaDonors
  };
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

// ====================
// Start HTTP Server
// ====================
app.listen(PORT_HTTP, () => {
  console.log(`🚀 Webhook aktif di http://localhost:${PORT_HTTP}`);
});
