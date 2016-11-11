var events = require('events');
var net = require('net');

const channel = new events.EventEmitter();
// A chatroom channel manages two things:
// 1. clients
// 2. subscriptions

// Who is in the channel
channel.clients = {};
// Broadcasting function
channel.subscriptions = {};

// Event listener on 'join' event of Channel
channel.on('join', function(id, client) {
  this.clients[id] = client;

  // subscriptions is a function used to broadcast own message to all suscribers other than selfs.
  // So each client has its own suscriptions function.
  // whenever the sender is not me, write the message to my console.
  this.subscriptions[id] = function(senderId, message) {
    if (id != senderId) {
      this.clients[id].write(senderId + ' says: ' + message + '\n');
    }
  };

  // Greet the user and tell him/her the number of guests online (plus one to count him/her self)
  var welcome = "Welcome! " + 'Guests online: ' + (this.listeners('broadcast').length + 1) ;
  client.write(welcome + '\n');

  // Register 'broadcast' listener to the Channel with a callback of subscriptions functions. Whenever data comes in, 'broadcast' event is triggered, and subscriptions functions of Channel is called on every client.
  // This will triggered all subscriptions function for all clients
  this.on('broadcast', this.subscriptions[id]);
});


// Create a TCP server. Whenever a connection is made, the callback is executed.
var server = net.createServer(function(client) {
  // Client's unique ID is defined by client's IP address and port number
  var id = client.remoteAddress + ':' + client.remotePort;
  console.log('A new connection was made with ID: ', id);

  // client.on('connect', function() {
  //   channel.emit('join', id, client);
  // });
  // Above code won't work
  // Because on the server side, the client(socket) is already connected when you
  // get the callback, and the event you're trying to listen to isn't emitted on
  // an already connected socket.
  // Instead, use the code below:

  // Callback to net.createServer is called because of an implicit 'connection' event
  channel.emit('join', id, client);

  // Event listener on 'data' event of Client
  client.on('data', function(data) { // When data come in, emit 'broadcast' event and pass sender's id and data to subscriptions function
  data = data.toString().trim();
    // When user entered "shutdown", emit 'shutdown' event
    if (data == "shutdown") {
      channel.emit('shutdown');
    } else {
    // When user entered anything else, emit 'broadcast' event
    channel.emit('broadcast', id, data);
    }
  });

  client.on('close', function() { // When client disconnects, emit 'close' event on client
    channel.emit('leave', id); // than emit 'leave' event on Channel
  });

});
server.listen(8888);


// Event listener on 'leave' event of Channel
channel.on('leave', function(id) {
  channel.removeListener(    // Remove 'broadcast' listener from the client
    'broadcast', this.subscriptions[id]);
  channel.emit('broadcast', 'system' ,id + ' has left the chat. \n'); // Tell other clients
});

// Event listener on 'shutdown' event of Channel
// Once shutdown, it'll remove all listeners of 'broadcast' from Channel
channel.on('shutdown', function() {
  channel.emit('broadcast', 'system', 'Chat has shut down. \n');
  // second argument is neccessary
  channel.removeAllListeners('broadcast', this.subscriptions);
});
