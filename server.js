var events = require('events');
var net = require('net');

const channel = new events.EventEmitter();
channel.clients = {};
channel.subscriptions = {};

channel.on('join', function(id, client) {
  this.clients[id] = client;
  this.subscriptions[id] = function(senderId, message) {
    if (id != senderId) {
      this.clients[id].write(senderId + ' says: ' + message + '\n');
    }
  }; // subscriptions is a function used to broadcast own message to all suscribers other than selfs. So each client has its own suscriptions function.
  // whenever the sender is not me, write the message to my console.

  var welcome = "Welcome! " + 'Guests online: ' + (this.listeners('broadcast').length + 1) ; // Greet the user and tell him/her the number of guests online (plus one to count him/her self)
  client.write(welcome + '\n');

  this.on('broadcast', this.subscriptions[id]); // Register 'broadcast' listener to the Channel with a callback of subscriptions functions. Whenever data comes in, 'broadcast' event is triggered, and subscriptions functions of Channel is called on every client.
});
channel.on('leave', function(id) {
  channel.removeListener(    // Remove 'broadcast' listener from the client
    'broadcast', this.subscriptions[id]);
  channel.emit('broadcast', 'system' ,id + ' has left the chat. \n'); // Tell other clients
});

channel.on('shutdown', function() {   // shutdown listener on Channel. One shutdown, remove all listeners of 'broadcast' from Channel
  channel.emit('broadcast', 'system', 'Chat has shut down. \n');
  channel.removeAllListeners('broadcast', this.subscriptions); // second argument is neccessary
});


var server = net.createServer(function(client) {  // Create a TCP server. Whenever a connection is made, the callback is executed.
  var id = client.remoteAddress + ':' + client.remotePort;
  console.log('A new connection was made: ', id);

  // client.on('connect', function() {
  //   channel.emit('join', id, client);
  // });
  // Above code won't work
  // Because on the server side, the client(socket) is already connected when you
  // get the callback, and the event you're trying to listen to isn't emitted on // an already connected socket.
  // Instead, use the code below:
  channel.emit('join', id, client); // Callback to net.createServer is called because of an implicit 'connection' event


  client.on('data', function(data) { // When data come in, emit 'broadcast' event and pass sender's id and data to subscriptions function
  data = data.toString().trim();
    if (data == "shutdown") {  // When user entered "shutdown", emit 'shutdown' event
      channel.emit('shutdown');
    }
    channel.emit('broadcast', id, data); // When user entered anything else, emit 'broadcast' event
  });

  client.on('close', function() { // When client disconnects, emit 'close' event on client
    channel.emit('leave', id); // than emit 'leave' event on Channel
  });

});
server.listen(8888);
