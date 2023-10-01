const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const port = 4913;
const app = express();
const server = http.createServer(app);

server.version ='v.0.1.2';

const wss = new WebSocket.Server({ server })
//const wss = new WebSocket.Server({port: port })


wss.newtoken = () => {
  this.extra = {
    token:jwt.sign({ userId: "chimere" }, 'RANDOM_TOKEN_SECRET', { expiresIn: '1h' }),
    date : new Date()
  }
}
wss.getTokenMessage = () => {
  return JSON.stringify({
    name:"systeme",
    content : "",
    type: 6,
    extra: this.extra
  })
}
wss.newtoken()



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
    //console.log("pong")
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
    console.log('message',json)

    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
      else {
        if(data.extra?.token==undefined) {
          client.send(wss.getTokenMessage());
        }
      }
    })
  })
})


//renew token
setInterval(() => {
  //console.log("renew token")
  wss.newtoken()
  wss.clients.forEach((client) => {     
      
      if (!client.isAlive) {
        //console.log(" ********* is dead:");
        return client.terminate();
      }
      else {
        //console.log(" ********* is alive ");
        client.send(wss.getTokenMessage());
      }
      
      client.isAlive = false;
      client.ping(null, false, true);
  });
}, 10000);

server.listen(port, "192.168.1.76", ()=> {
  console.log(`Server is listening on ${port}!`)
})