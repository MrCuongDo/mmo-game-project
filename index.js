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

let Entity = function(){
	let self = {
		x: 250,
		y:250,
		spdX: 0,
		spdY: 0,
		id: ''

	};

	self.update = function(){
		self.updatePosition();
	};

	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;
	};

	return self;
}

let Player = function(id){
	let self = Entity();
	self.id = id;
	self.number = ''+Math.floor(10 * Math.random());

	self.maxMoveSpd = 10;
	self.pressingUp= false;
	self.pressingDown= false;
	self.pressingLeft= false;
	self.pressingRight= false;

	let super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();
	}

	self.updateSpd = function() {
		if(self.pressingRight){
			self.spdX = self.maxMoveSpd;
		}else if(self.pressingLeft){
			self.spdX = -self.maxMoveSpd;
		}else{
			self.spdX = 0;
		}
		if(self.pressingUp){
			self.spdY = -self.maxMoveSpd;
		}else if(self.pressingDown){
			self.spdY = self.maxMoveSpd;
		}else{
			self.spdY = 0;
		}

	}
	Player.list[id] = self; // create new player automatically
	return self;
}

Player.list = {};
Player.onConnect = function(socket) {
	let player = Player(socket.id);
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
}
Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
}
Player.update = function() {
	let pack = [];
	for (let i in Player.list){
		let player = Player.list[i];
		player.update();
		pack.push({
			x: player.x,
			y: player.y,
			number : player.number
		})
	}
	return pack;
}


//----------BULLET------------
let Bullet = function(angle){
	let self = Entity();
	self.id = Math.random();
	self.spdX=Math.cos(angle/180*Math.PI) * 10;
	self.spdY=Math.sin(angle/180*Math.PI) * 10;

	self.timer  =0;
	self.toRemove = false;

	let super_update = self.update;
	self.update = function(){
		if(self.timer++ > 100){
			self.toRemove = true;
		}
		super_update();
	}

	Bullet.list[self.id] = self; // create new player automatically
	return self;
}

Bullet.list = {};

Bullet.update = function(){
	if(Math.random() < 0.1) {
		Bullet(Math.random()* 360);
	}

	let pack = [];
	for(let i in Bullet.list) {
		let bullet = Bullet.list[i];
		bullet.update();
		pack.push({
			x:bullet.x,
			y:bullet.y
		});
	}
	return pack;
}

//===== SOCKET IO CONTROLLER ======
io.on('connection',function(socket){
	console.log('player connection');

	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	Player.onConnect(socket);
	socket.on('disconnect',  function () {
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);	
	});
});


//===== MAIN APP ======
setInterval(function() {
	let pack = {
		player: Player.update(),
		bullet: Bullet.update(),	
	}; // get new infomation XY from all players
	
	for(let i in SOCKET_LIST){
		let socket = SOCKET_LIST[i];
		socket.emit('newPosition',pack)  // emit to client
	}

},1000/30);




