const express = require('express');
const http = (process.env.NODE_ENV === 'production' ) ? require('https'):require('http');
const WebSocket = (process.env.NODE_ENV === 'production' ) ? require('wss'):require('ws');
const jwt = require('jsonwebtoken');
 
const port = process.env.PORT || 4913;
const app = express();
const server = http.createServer(app);

server.version ='v.0.1.3';

const wss = new WebSocket.Server({ server });
//const wss = new WebSocket.Server({port: port })
//https://atomrace.com/creer-serveur-websocket-socket-io

wss.newtoken = (room) => {
  return {
    token:jwt.sign({ userId: "chimere"+room??"" }, 'RANDOM_TOKEN_SECRET', { expiresIn: '1h' }),
    date : new Date()
  }
}

wss.getTokenMessage = (extra) => {
  return JSON.stringify({
    name:"systeme",
    content : "",
    type: 6,
    extra: extra
  })
}

wss.rooms = [];

changeRoom = (socket, server) => {
  socket.isAlive = false;
  server.rooms.find(room => { room.users = room.users.filter(user => user !== socket)});
}

close = (socket, server) => {
  socket.isAlive = false;
  server.rooms.find(room => { room.users = room.users.filter(user => user !== socket)});
  socket.terminate();
}

app.get('*', function(req, res, next) {
  return res.send('Hello World!');
});

wss.on('connection', function connection(ws) {

  ws.isAlive = true;
  ws.name="";
  ws.roomName="";

  console.log('connection');

  ws.on("unexpected-response", ()=> {
    console.log("unexpected-response")
  })

  server.on('upgrade', async function upgrade(request, socket, head) {
    console.log('upgrade'/*,request, socket, head*/);
  }); 

  ws.on('pong', () => {
    //console.log("pong")
    ws.isAlive = true;
  });

  ws.on('close', () => {
    /*console.log("close");
    ws.isAlive = false;
    wss.rooms.find(room => { room.users = room.users.filter(user => user !== ws)});
    ws.terminate();*/
    close(ws,wss)
  });

  server.on('open', function open() {
    console.log('**** connected');
    ws.send(Date.now());
  });

  ws.on('error', () => {
    console.log('socket-error');
  })
  ws.on('upgrade', () => {
    console.log('socket-upgrade');
  })

  ws.on('message', function incoming(data) {
    let message = JSON.parse(data);
    console.log('message',message)
    
    if(message.type === 5) {
      changeRoom(ws,wss)
    }
    else if(message.type === 4) {
      
      ws.name = message.name;
      ws.room = message.room;

      if(wss.rooms.filter(r=> r.name == message.room).length === 0)
      {
        let room = {
          name : message.room,
          users : [],
          token : wss.newtoken()
        }
        room.users.push(ws);

        wss.rooms = [
            room
          , ...wss.rooms
        ]
      }
      else wss.rooms.find(r=> r.name ==message.room).users.push(ws)
    }
    

    wss.rooms.filter(r=> r.name == message.room).forEach(room => 
    { 
      room.users.forEach(user => 
      {
        if (user !== ws && user.readyState === WebSocket.OPEN) 
        {
          user.send(data);
        }
        else 
        {
          if(!(data.extra!=undefined && data.extra.token!=undefined)) 
          //if(message.type === 4) {
            user.send(wss.getTokenMessage(room.token));
        }
      })
    })
  })
})


//renew token
setInterval(() => {  
  var i = 0;

  wss.rooms.map(room => {
    room.token = wss.newtoken(room.name);

    room.users.map(user => {
      console.log("room:"+room.name,"user:"+user.name/*,"token:"+room.token.token*/)
      i++;
      if (!user.isAlive) {
        //console.log(" ********* is dead:");
        return user.terminate();
      }
      else {
        //console.log(" ********* is alive ");
        user.send(wss.getTokenMessage(room.token));
      }
      
      user.isAlive = false;
      user.ping(null, false, true);
    })
  })
  //console.log(i/2)
}, 30000);

server.listen(port, ()=> {
  console.log(`Server is listening on ${port}!`)
})