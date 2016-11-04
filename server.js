var events = require('events');
var net = require('net');

const channel = new events.EventEmitter();
channel.clients = {};
channel.subscriptions = {};

channel.on('join', function(id, client) {
  this.clients[id] = client;
  this.subscriptions[id] = function(senderId, message) {
    if (id != senderId) {
      this.clients[id].write('[ID] ' + id + ' says: ' + message + '\n');
    }
  };
  this.on('broadcast', this.subscriptions[id]); // how to emit broadcast event?
});

var server = net.createServer(function(client) {
  var id = client.remoteAddress + ':' + client.remotePort;
  console.log('A new connection was made: ', id);

  channel.emit('join', id, client); // Callback to net.createServer is called because of an implicit 'connection' event

  // client.on('connect', function() {
  //   channel.emit('join', id, client);
  // });
  // Above code won't work
  // Because on the server side, the client(socket) is already connected when you
  // get the callback, and the event you're trying to listen to isn't emitted on // an already connected socket.

  client.on('data', function(data) {
    data = data.toString('utf8').trim();
    console.log('[ID] ' + id + ' says: ' + data);
    channel.emit('broadcast', id, data);
  });
});
server.listen(8888);
