// Simple test script to send a Pusher Beams notification
const https = require('https');

const data = JSON.stringify({
  interests: ['trade_alerts'],
  web: {
    notification: {
      title: '🚀 Test from Node.js',
      body: 'Pusher Beams + Trade Imperial = Working! 🎉',
      icon: 'https://tradeimperial.com/icon-192.png',
      deep_link: 'https://tradeimperial.com/dashboard/signal-stream',
    },
    data: {
      test: true,
      timestamp: new Date().toISOString(),
    },
  },
});

const options = {
  hostname: 'de4fb62d-141b-4d1c-98b5-c3ec6e5eec4b.pushnotifications.pusher.com',
  path: '/publish_api/v1/instances/de4fb62d-141b-4d1c-98b5-c3ec6e5eec4b/publishes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 1685210426218696D020B8E06D7729A719D5E7501F5D228F682914D218891199',
    'Content-Length': data.length,
  },
};

console.log('📤 Sending test notification to trade_alerts interest...\n');

const req = https.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', JSON.parse(body));
    
    if (res.statusCode === 200) {
      console.log('\n✅ SUCCESS! Check your notification center!');
    } else {
      console.log('\n❌ FAILED');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ ERROR:', error.message);
});

req.write(data);
req.end();

