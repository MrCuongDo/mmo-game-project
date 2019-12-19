require('dotenv').config() // use for using of process.env
let mongojs = require('mongojs');
let db = mongojs('localhost:27017/myGame', ['account', 'progress']);

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
let server = app.listen(port, function () { // server start from here
	console.log(`Example app listening on port ${port}!`)
});
let io = require('socket.io')(server);
let SOCKET_LIST = {};

let Entity = function () {
	let self = {
		x: 250,
		y: 250,
		spdX: 0,
		spdY: 0,
		id: ''

	};

	self.update = function () {
		self.updatePosition();
	};

	self.updatePosition = function () {
		self.x += self.spdX;
		self.y += self.spdY;
	};

	self.getDistance = function (entity2) { // return distance (number)
		let vx = self.x - entity2.x;
		let vy = self.y - entity2.y;
		return Math.sqrt(vx * vx + vy * vy);
	}

	self.testCollision = function (entity2) { // return if colliding (true/false)
		let rect1 = {
			x: self.x - self.width / 2,
			y: self.y - self.height / 2,
			width: self.width,
			height: self.height
		}

		let rect2 = {
			x: entity2.x - entity2.width / 2,
			y: entity2.y - entity2.height / 2,
			width: entity2.width,
			height: entity2.height
		}
		return testCollisionRectRect(rect1, rect2);
	}

	return self;
}

let USERS = {
	'cuong': '123',
	'binh': '123',
}

let isValidPassword = function (data, callback) {
	db.account.find({ username: data.username, password: data.password }, function (err, docs) {
		if (err) {
			throw new Error(err);
		}
		if (docs.length > 0) {
			callback(true);
		} else {
			callback(false);
		}
	});
}

let isUsernameTaken = function (data, callback) {
	db.account.find({ username: data.username }, function (err, docs) {
		if (err) {
			throw new Error(err);
		}
		if (docs.length > 0) {
			callback(true);
		} else {
			callback(false);
		}
	});
}
let addUser = function (data, callback) {
	db.account.insert({ username: data.username, password: data.password }, function (err) {
		if (err) {
			throw new Error(err);
		}
		callback();
	});;
}

//-----------PLAYER ------------
let Player = function (id) {
	let self = Entity();
	self.id = id;
	self.number = '' + Math.floor(10 * Math.random());

	self.maxMoveSpd = 10;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingLeft = false;
	self.pressingRight = false;

	self.pressingAttack = false;
	self.mouseAngle = 0;

	self.hp= 10;
	self.hpMax = 10;
	self.score =0;

	let super_update = self.update;
	self.update = function () {
		self.updateSpd();
		super_update();

		if (self.pressingAttack) {
			for (let i = -3; i < 3; i++) {
				self.shootBullet(i * 10 + self.mouseAngle);
			}
		}
	}

	self.shootBullet = function (angel) {
		let b = Bullet(self.id, angel);
		b.x = self.x;
		b.y = self.y;
	}

	self.updateSpd = function () {
		if (self.pressingRight) {
			self.spdX = self.maxMoveSpd;
		} else if (self.pressingLeft) {
			self.spdX = -self.maxMoveSpd;
		} else {
			self.spdX = 0;
		}
		if (self.pressingUp) {
			self.spdY = -self.maxMoveSpd;
		} else if (self.pressingDown) {
			self.spdY = self.maxMoveSpd;
		} else {
			self.spdY = 0;
		}

	}

	self.getInitPack =  function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			number: self.number,
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
		};
	}

	self.getUpdatePack =  function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			hp: self.hp,
			score: self.score,
		};
	}

	Player.list[id] = self; // create new player automatically

	initPack.player.push(self.getInitPack());
	return self;
}

Player.list = {};

Player.onConnect = function (socket) {
	let player = Player(socket.id);
	socket.on('keyPress', function (data) {
		if (data.inputId === 'left')
			player.pressingLeft = data.state;
		else if (data.inputId === 'right')
			player.pressingRight = data.state;
		else if (data.inputId === 'up')
			player.pressingUp = data.state;
		else if (data.inputId === 'down')
			player.pressingDown = data.state;
		else if (data.inputId === 'attack')
			player.pressingAttack = data.state;
		else if (data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;

	});

	let tempBullets = [];
	for (let i in Bullet.list){
		tempBullets.push(Bullet.list[i].getInitPack());
	}

	socket.emit('init', {
		player: Player.getAllInitPack(),
		bullet: Bullet.getAllInitPack()
	})
}

Player.getAllInitPack = function() {
	let tempPlayers = [];
	for (let i in Player.list){
		tempPlayers.push(Player.list[i].getInitPack());
	}
	return tempPlayers;
}

Player.onDisconnect = function (socket) {
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}

Player.update = function () {
	let pack = [];
	for (let i in Player.list) {
		let player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
}

//----------BULLET------------
let Bullet = function (parent, angle) {
	let self = Entity();
	self.id = Math.random();
	self.spdX = Math.cos(angle / 180 * Math.PI) * 10;
	self.spdY = Math.sin(angle / 180 * Math.PI) * 10;
	self.parent = parent;
	self.timer = 0;
	self.toRemove = false;

	let super_update = self.update;
	self.update = function () {
		if (self.timer++ > 100) {
			self.toRemove = true;
		}
		super_update();

		for (let i in Player.list) {
			let p = Player.list[i];
			if (self.getDistance(p) < 32 && self.parent !== p.id) {
				p.hp -= 1;
				
				if(p.hp <= 0) {
					let shooter = Player.list[self.parent];
					if(shooter) {
						shooter.score +=1 ;
					}
					p.hp = p.hpMax;
					p.x = Math.random()*500;
					p.y = Math.random()*500;
				}


				self.toRemove = true;
			}
		}
	}

	self.getInitPack =  function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			number: self.number,
		};
	}

	self.getUpdatePack =  function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
		};
	}

	Bullet.list[self.id] = self; // create new player automatically
	initPack.bullet.push(self.getInitPack());
	return self;
}

Bullet.getAllInitPack = function() {
	let tempBullets = [];
	for (let i in Bullet.list){
		tempBullets.push(Bullet.list[i].getInitPack());
	}
	return tempBullets;
}

Bullet.list = {};

Bullet.update = function () {
	let pack = [];
	for (let i in Bullet.list) {
		let bullet = Bullet.list[i];
		bullet.update();
		if (bullet.toRemove) {
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else {
			pack.push(bullet.getUpdatePack());
		}
	}
	return pack;
}

//===== SOCKET IO CONTROLLER ======
io.on('connection', function (socket) {
	console.log('player connection');

	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	socket.on('signIn', function (data) {
		isValidPassword(data, function (res) {
			if (res) {
				Player.onConnect(socket); // create user
				socket.emit('signInResponse', { success: true });
			}
			else {
				socket.emit('signInResponse', { success: false });
			}
		});
	})

	socket.on('signUp', function (data) {
		isUsernameTaken(data, function (res) {
			if (res) {
				socket.emit('signUpResponse', { success: false });
			}
			else {
				addUser(data, function () {
					socket.emit('signUpResponse', { success: true });
				});
			}
		});

	})

	socket.on('disconnect', function () {
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});

	socket.on('sendMsgToServer', function (data) {
		let playerName = ("" + socket.id).slice(2, 7);
		for (let i in SOCKET_LIST) {
			SOCKET_LIST[i].emit('addToChat', playerName + ': ' + data);
		}
	});

	socket.on('evalMsg', function (data) {
		if (!process.env.DEBUG)
			return; // if DBUG is false then return
		let res = eval(data);
		socket.emit('evalMsgToClient', res);
	});

});

//===== MAIN APP ======
let initPack ={player:[], bullet:[]};
let removePack ={player:[], bullet:[]};

setInterval(function () {
	let pack = {
		player: Player.update(),
		bullet: Bullet.update(),
	}; // get new infomation XY from all players

	for (let i in SOCKET_LIST) {
		let socket = SOCKET_LIST[i];
		socket.emit('init', initPack)  // emit to client
		socket.emit('update', pack)  // emit to client
		socket.emit('remove', removePack)  // emit to client
	}

	// reset packs to empty in order to not duplicate data to client
	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];
	

}, 1000 / 30);




