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

io.on('connection',function(socket){
	console.log('socket connection');

	//test
	socket.on('cuong', function (data){
		console.log('cuong' + data.reason);
	});

	socket.emit('serverTestMsg', {
		msg: 'hello from server'
	});
});
