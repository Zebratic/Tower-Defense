const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => { console.log('Connected to server.'); }
socket.onmessage = (message) => { console.log(message.data); }
socket.onerror = (error) => { console.log(`Socket error: ${error}`); }
socket.onclose = () => { console.log('Socket closed.'); }
window.onbeforeunload = () => { socket.close(); }


function sendMessage(data) { socket.send(data); }