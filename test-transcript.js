fetch('http://localhost:3026/api/jitsi/transcript', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomName: 'debug_room_123',
    transcript: [{ sender: 'Doctor', text: 'Hello world', timestamp: new Date() }]
  })
}).then(res => res.json()).then(console.log).catch(console.error);
