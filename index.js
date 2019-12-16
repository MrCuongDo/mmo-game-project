const express = require('express');
const app = express();
const port = 3000;
const serv = require('http').Server(app);

app.get('/', (req, res) => res.sendFile(__dirname + '/client/index.html'));
app.use('/client', express.static(__dirname + '/client'));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));