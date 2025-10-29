// server.js
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

let driverSocket = null;
let monitorSocket = null;

console.log(`Signaling server started on port ${PORT}...`);

wss.on('connection', (ws) => {
  console.log('Client connected...');

  // --- *** ลบ Logic การกำหนดบทบาทเดิมออก *** ---
  // if (driverSocket === null) { ... } else if (...) ...

  // --- *** เพิ่ม Logic ใหม่: รอ Client แนะนำตัว *** ---
  ws.once('message', (message) => { // ใช้ 'once' เพื่อรอข้อความแรกเท่านั้น
    try {
      const data = JSON.parse(message);

      // 1. ตรวจสอบข้อความแนะนำตัว
      if (data.type === 'identify' && data.role === 'driver') {
        if (driverSocket === null || driverSocket.readyState !== WebSocket.OPEN) {
          driverSocket = ws;
          console.log('Driver identified and connected.');
          ws.send(JSON.stringify({ type: 'info', message: 'You are the driver' }));
          // เริ่ม lắng ฟัง ข้อความอื่นๆ หลังจากระบุตัวตนแล้ว
          setupMessageListener(ws);
        } else {
          console.log('Driver connection rejected: Driver already connected.');
          ws.send(JSON.stringify({ type: 'error', message: 'Driver already connected' }));
          ws.close();
        }
      } else if (data.type === 'identify' && data.role === 'monitor') {
        if (monitorSocket === null || monitorSocket.readyState !== WebSocket.OPEN) {
          monitorSocket = ws;
          console.log('Monitor identified and connected.');
          ws.send(JSON.stringify({ type: 'info', message: 'You are the monitor' }));
          // เริ่ม lắng ฟัง ข้อความอื่นๆ
          setupMessageListener(ws);
        } else {
          console.log('Monitor connection rejected: Monitor already connected.');
          ws.send(JSON.stringify({ type: 'error', message: 'Monitor already connected' }));
          ws.close();
        }
      } else {
        // ถ้าข้อความแรกไม่ใช่การระบุตัวตนที่ถูกต้อง
        console.log('Invalid identification message received.');
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid identification' }));
        ws.close();
      }
    } catch (e) {
      console.error('Failed to parse identification message:', e);
      ws.close();
    }
  });
  // --- *** จบ Logic ใหม่ *** ---


  // --- *** แยก Logic การส่งข้อความปกติออกมาเป็นฟังก์ชัน *** ---
  function setupMessageListener(socket) {
    socket.on('message', (message) => {
        // ตรวจสอบว่าข้อความมาจาก Client ที่ระบุตัวตนแล้วหรือยัง
        // (จริงๆ ไม่ต้องเช็กก็ได้ เพราะเรา setup listener หลังระบุตัวตนแล้ว)
        if (socket !== driverSocket && socket !== monitorSocket) return;

        try {
            const data = JSON.parse(message);

            // ข้ามข้อความ identify ที่อาจส่งซ้ำ
            if (data.type === 'identify') return;

            // ส่งต่อไปยังอีกฝั่ง
            if (socket === driverSocket) {
                if (monitorSocket && monitorSocket.readyState === WebSocket.OPEN) {
                    // แปลง message Buffer เป็น string ก่อนส่งต่อ
                    monitorSocket.send(message.toString());
                }
            } else if (socket === monitorSocket) {
                if (driverSocket && driverSocket.readyState === WebSocket.OPEN) {
                   // แปลง message Buffer เป็น string ก่อนส่งต่อ
                    driverSocket.send(message.toString());
                }
            }
        } catch(e) {
            console.error("Failed to parse or forward message:", e);
        }
    });

    // ตรรกะเมื่อหลุด (เหมือนเดิม แต่ใช้ socket แทน ws)
    socket.on('close', () => {
      if (socket === driverSocket) {
        driverSocket = null;
        console.log('Driver disconnected.');
      } else if (socket === monitorSocket) {
        monitorSocket = null;
        console.log('Monitor disconnected.');
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      // อาจจะเพิ่มการเคลียร์ socket ที่นี่ด้วยก็ได้
      if (socket === driverSocket) driverSocket = null;
      if (socket === monitorSocket) monitorSocket = null;
    });
  }
  // --- *** จบฟังก์ชัน setupMessageListener *** ---

}); // จบ wss.on('connection')