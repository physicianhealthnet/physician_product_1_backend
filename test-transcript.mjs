import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3026/api/jitsi/transcript', {
      roomName: 'test_room_123',
      transcript: [{ sender: 'Doctor', text: 'Hello test', timestamp: new Date() }]
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
