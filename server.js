// server.js
const { WebSocketServer, WebSocket } = require('ws');

// เราจะใช้ Port ที่ Render กำหนดให้ หรือ 8080 ถ้าเทสเครื่องตัวเอง
const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

// เก็บการเชื่อมต่อ 2 คน
let driverSocket = null;
let monitorSocket = null;

console.log(`Signaling server started on port ${PORT}...`);

wss.on('connection', (ws) => {
  console.log('Client connected...');

  // 1. ตรรกะจับคู่ที่ง่ายที่สุด
  if (driverSocket === null) {
    driverSocket = ws;
    console.log('Driver connected.');
    ws.send(JSON.stringify({ type: 'info', message: 'You are the driver' }));
  } else if (monitorSocket === null) {
    monitorSocket = ws;
    console.log('Monitor connected.');
    ws.send(JSON.stringify({ type: 'info', message: 'You are the monitor' }));
  } else {
    // ถ้ามีคนพยายามต่อเป็นคนที่ 3
    console.log('Connection rejected: Room is full.');
    ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
    ws.close();
    return;
  }

  // 2. ตรรกะ "สะพาน" ส่งข้อความ
  ws.on('message', (message) => {
    // แปลงข้อความกลับเป็น Object
    const data = JSON.parse(message);

    if (ws === driverSocket) {
      // ถ้ามาจาก Driver -> ส่งไปให้ Monitor
      if (monitorSocket && monitorSocket.readyState === WebSocket.OPEN) {
        monitorSocket.send(JSON.stringify(data));
      }
    } else if (ws === monitorSocket) {
      // ถ้ามาจาก Monitor -> ส่งไปให้ Driver
      if (driverSocket && driverSocket.readyState === WebSocket.OPEN) {
        driverSocket.send(JSON.stringify(data));
      }
    }
  });

  // 3. ตรรกะเมื่อมีคนหลุด
  ws.on('close', () => {
    if (ws === driverSocket) {
      driverSocket = null;
      console.log('Driver disconnected.');
    } else if (ws === monitorSocket) {
      monitorSocket = null;
      console.log('Monitor disconnected.');
    }
  });

  ws.on('error', (err) => {
    console.error('Socket error:', err);
  });
});