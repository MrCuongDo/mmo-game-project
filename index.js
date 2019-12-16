const express = require('express');
const app = express();
const port = 3000;
// let server = require('http').Server(app);
// let io = require('socket.io')(server);

app.use('/client', express.static(__dirname + '/client'));
app.use('/public', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

// set up for socket io
let server = app.listen(port,function(){ // server start from here
	console.log(`Example app listening on port ${port}!`)
});
let io = require('socket.io')(server);
let SOCKET_LIST = {};
let PLAYER_LIST = {};

let Player = function(id){
	let self = {
		x: 250,
		y: 250,
		id: id,
		number: '' +  Math.floor(Math.random() * 10),

	}

	self.maxMoveSpd = 10;
	self.pressingUp= false;
	self.pressingDown= false;
	self.pressingLeft= false;
	self.pressingRight= false;

	self.updatePosition = function() {
		if(self.pressingRight){
			self.x += self.maxMoveSpd;
		}
		if(self.pressingLeft){
			self.x -= self.maxMoveSpd;
		}
		if(self.pressingUp){
			self.y -= self.maxMoveSpd;
		}
		if(self.pressingDown){
			self.y += self.maxMoveSpd;
		}
	}

	return self;
}

//===== SOCKET IO CONTROLLER ======
io.on('connection',function(socket){
	console.log('player connection');

	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	let player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;

	socket.on('disconnect',  function () {
		delete SOCKET_LIST[socket.id];
		delete PLAYER_LIST[socket.id];
	});

	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		if(data.inputId === 'right')
			player.pressingRight = data.state;
		if(data.inputId === 'up')
			player.pressingUp = data.state;
		if(data.inputId === 'down')
			player.pressingDown = data.state;
	})

});



//===== MAIN APP ======
setInterval(function() {
	let pack = [];
	for (let i in PLAYER_LIST){
		let player = PLAYER_LIST[i];
		player.updatePosition();
		pack.push({
			x: player.x,
			y: player.y,
			number : player.number
		})
	}

	for(let i in SOCKET_LIST){
		let socket = SOCKET_LIST[i];
		socket.emit('newPosition',pack)  // emit to client
	}

},1000/30);


