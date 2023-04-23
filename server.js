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

var cycle=0;
wss.newtoken = (room) => {
  //console.log('****\ncycle '+ (cycle++).toString() +': renew token\n****')
  return {
    token:jwt.sign({ userId: "chimere"+room??"" }, 'RANDOM_TOKEN_SECRET', { expiresIn: '1h' }),
    date : new Date()
  }
}

wss.getTokenMessage = (extra) => {
  return JSON.stringify({
    name:"systeme",
    type: 6, //Message.System
    extra: extra
  })
}

wss.rooms = [];

addSenderToRoom = (ws, sender, roomName) => {
  ws.name = sender;
  ws.room = roomName;
  console.log('- addSenderToRoom room',{roomName : roomName, user : sender })
  
  const room = wss.rooms.find(r=> r.name == roomName);

  if(!room)
  {
    let room = {
      name : roomName,
      users : [],
      token : wss.newtoken()
    }
    room.users.push(ws);

    console.log('\tCreate room:',roomName, ' with user:',sender)   

    wss.rooms = [
        room
      , ...wss.rooms
    ]
  }
  else {
    if(!room.users.some(user=> user.name === sender)) {
      console.log('\t Add user:',sender, ' to room:',roomName)
      room.users.push(ws)
    }
    else {
      console.log('\t Not add user:',sender, ' to room:',roomName, ' already exists')
    }
  }
}

broadcastMessage = (ws, room, message, data)=>{
  console.log('- broadcastMessage room',{roomName : room.name, NbWebSocket: room.users.length })
  room.users.forEach(userWs => 
    {
      if (userWs !== ws && userWs.readyState === WebSocket.OPEN) 
      {
        console.log('\tfrom:',message.name, 'to', userWs.name)
        userWs.send(data);
      }
      else 
      {
        if(!(data.extra!=undefined && data.extra.token!=undefined)) {
        //if(message.type === 4) {
          console.log("\tData",data)
          userWs.send(wss.getTokenMessage(room.token));
        }
      }
    })
}

changeRoom = (socket, server) => {
  console.log('changeRoom')
  socket.isAlive = false;
  server.rooms.find(room => { room.users = room.users.filter(user => user !== socket)});
}

close = (socket, server) => {
  console.log('close')
  socket.isAlive = false;
  server.rooms.find(room => { room.users = room.users.filter(user => user !== socket)});
  socket.terminate();
}

app.get('*', function(req, res, next) {
  return res.send('Hello World!');
});

var comm=0;

wss.on('connection', function connection(ws) {

  ws.isAlive = true;
  ws.name="";
  ws.roomName="";

  console.log('connection');

  ws.on("unexpected-response", ()=> {
    console.log("unexpected-response")
  })

  server.on('upgrade', async function upgrade(request, socket, head) {
    //console.log('upgrade'/*,request, socket, head*/);
  }); 

  ws.on('pong', () => {
    console.log("pong")
    ws.isAlive = true;
  });

  ws.on('close', () => {
    console.log("close");
    /*ws.isAlive = false;
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
    console.log('\n****\n comm : '+(comm++).toString() )
    let message = JSON.parse(data);
    //console.log('message',message)
    
    //MessageType.Disconnection
    if(message.type === 5) {
      changeRoom(ws,wss)
    }
    //MessageType.Connection
    else if(message.type === 4) {
      addSenderToRoom(this,message.name, message.room);
    }    
    
    //MessageType.Message
    wss.rooms.filter(r=> r.name == message.room).forEach(room => 
    { 
      broadcastMessage(this,room, message, data);
    })
    console.log('fin com\n****')
  })
})


//renew token
setInterval(() => {  
  var i = 0;

  wss.rooms.map(room => {
    room.token = wss.newtoken(room.name);

    //console.log("room",room, "users",room.users);

    room.users.map(user => {
      //console.log("room:"+room.name,"user:"+user.name/*,"token:"+room.token.token*/)
      i++;
      if (!user.isAlive) {
        //console.log(" ********* is dead:");
        return user.terminate();
      }
      else {
        //console.log(" ********* is alive ");
        let getTokenMessage = wss.getTokenMessage(room.token)
        user.send(getTokenMessage);
      }
      
      //user.isAlive = false;
      //user.ping(null, false, true);
    })
  })
  //console.log(i/2)
}, 30000);

server.listen(port, ()=> {
  console.log(`Server is listening on ${port}!`)
})