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
let PLAYER_LIST = {};

io.on('connection',function(player){
	console.log('player connection');

	player.id = Math.random();
	player.x = 0;
	player.y = 0;
	player.number = '' + Math.floor( Math.random() * 10);
	PLAYER_LIST[player.id] = player;

	player.on('disconnect',  function () {
		delete PLAYER_LIST[player.id];
	});

});

setInterval(function() {
	let pack = [];
	for (let i in PLAYER_LIST){
		let player = PLAYER_LIST[i];
		player.x++;
		player.y++;
		pack.push({
			x: player.x,
			y: player.y,
			number : player.number
		})
	}

	for(let i in PLAYER_LIST){
		let player = PLAYER_LIST[i];
		player.emit('newPosition',pack)  // emit to client
	}

},1000/25);


