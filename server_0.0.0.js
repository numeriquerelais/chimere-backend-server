const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 4913, 'Access-Control-Allow-Origin': "*" });

server.on('header', (headers, request) => {
  console.log('server-header', headers, request);
})
.on('upgrade', function upgrade(request, socket, head) {
  console.log('server-upgrade', headers, request);
})
.on('connection', (socket) => {
  console.log('server-connection');

  var result = 0;
  server.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      result++;
    }
  });
//test
  console.info("Total connected clients:", result);

  socket.on('open', function open() {
    console.log('socket-open');
    socket.send(Date.now());
  })
  .on('close', function close() {
    console.log('socket-close');
  })
  .on('ping', function ping() {
    console.log('socket-ping');
  })
  .on('pong', function pong() {
    console.log('socket-pong');
  })
  .on('error', function error(error) {
    console.log('socket-error', error );
  })
  .on('upgrade', function upgrade(response ) {
    console.log('socket-upgrade', response  );
  })
  .on('message', (data) => {
    console.log('socket-message');

    server.clients.forEach(function each(client) {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  })
  .on('error', (error)=> {
    console.log('server-error', error);
  })
  .on('close', (error)=> {
    console.log('server-close', error);
  });
});
//node server.js
//https://stackoverflow.com/questions/22429744/how-to-setup-route-for-websocket-server-in-express
//https://github.com/websockets/ws/issues/377