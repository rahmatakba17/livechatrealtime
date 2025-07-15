const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const app = express();
const wss = new WebSocket.Server({ port: 8080 });
let allComments = [], totalDonations = 0, giftSenders = {}, saweriaDonors = [];

app.use(express.json());
app.use(express.static('frontend'));

app.post('/saweria-webhook', (req, res) => {
  const donor = {
    nickname: req.body.name || 'Anonim',
    amount: req.body.amount || 0,
    event: 'saweria',
    timestamp: Date.now()
  };
  saweriaDonors.push(donor);
  totalDonations += 1;
  saveToFile();
  res.sendStatus(200);
});

function saveToFile() {
  fs.writeFileSync('data.json', JSON.stringify({
    comments: allComments,
    total: totalDonations,
    giftSenders,
    saweriaDonors
  }, null, 2));
}

app.listen(3000, () => console.log('Webhook listening on port 3000'));
