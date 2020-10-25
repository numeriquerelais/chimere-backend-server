const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const port = 4913;
const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server })
//const wss = new WebSocket.Server({port: port })

app.get('*', function(req, res, next) {
  return res.send('Hello World!');
});

wss.on('connection', function connection(ws) {

  console.log('connection');

  ws.on("unexpected-response", ()=> {
    console.log("unexpected-response")
  })

  server.on('upgrade', async function upgrade(request, socket, head) {
    console.log('upgrade'/*,request, socket, head*/);
  });

  ws.isAlive = true;
  ws.name="";

  ws.on('pong', () => {
    console.log("pong")
    ws.isAlive = true;
  });

  ws.on('close', () => {
    console.log("close")
    ws.isAlive = false;
  });

  ws.on('error', () => {
    console.log('socket-error');
  })
  ws.on('upgrade', () => {
    console.log('socket-upgrade');
  })

  ws.on('message', function incoming(data) {
    let json = JSON.parse(data);
    console.log(json)

    wss.clients.forEach(function each(client) {
      if(client === ws && ws.name=="") {
        let json = JSON.parse(data);
        client.name = JSON.name;    
      }
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    })
  })
})



setInterval(() => {
  wss.clients.forEach((ws) => {
      
      if (!ws.isAlive) {
        console.log(" ********* is dead:");
        return ws.terminate();
      }
      else console.log(" ********* is alive ");
      
      ws.isAlive = false;
      ws.ping(null, false, true);
  });
}, 10000);

server.listen(port, "0.0.0.0", ()=> {
  console.log(`Server is listening on ${port}!`)
})