var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

const http = require('http');
const socketIO = require('socket.io');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
app.use(cors())

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
      origin: '*',
    },
});

const channels = {};
const users = {};
const messages = [];

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on('set-nickname', (nickname) => {
        console.log(socket.id+"has set nickname: "+nickname)
        socket.nickname = nickname;
        users[socket.id] = { nickname };
      });
    
    // Add private-message event listener
    socket.on('private-message', (recipient, msg) => {
    const senderNickname = users[socket.id].nickname;
    const recipientSocketId = Object.keys(users).find(id => users[id].nickname === recipient);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receive-private-message', senderNickname, msg);
    }
        });

    socket.on('get-users', () => {
        const userList = Object.values(users).map(user => user.nickname);
        socket.emit('update-users', userList);
      });

    socket.on('get-channels', () => {
        const channelList = Object.keys(channels);
        socket.emit('update-channels', channelList);
      });

    socket.on('join-channel', (channel) => {
        socket.join(channel);
        console.log('user '+socket.nickname+' has joined '+channel)
        channels[channel] = channels[channel] || [];
        channels[channel].push(socket.id);
        users[socket.id].channel = channel;
        // Emit chat history for the selected channel
        const chatHistory = messages.filter(msg => msg.channel === channel);
        socket.emit('chat-history', chatHistory);
      });

    socket.on('create-channel', (channel) => {
        if (!channels[channel]) {
          channels[channel] = [];
          io.emit('update-channels', Object.keys(channels));
          console.log("channel "+channel+' has created!')
        }
      });

    socket.on('send-message', (channel, msg) => {
        messages.push({ channel, user: users[socket.id].nickname, msg });
        io.to(channel).emit('receive-message', socket.nickname, msg);
      });
  
    socket.on("disconnect", () => {
        console.log('A user disconnected:', socket.id);
        if (users[socket.id]) {
            const userChannels = users[socket.id].channels;
            if (userChannels) {
                userChannels.forEach((channel) => {
                  channels[channel] = channels[channel].filter((id) => id !== socket.id);
                });
            }
            delete users[socket.id];
        }
    });
  });

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

server.listen(1234, () => {
    console.log('Server is listening on port 1234');
});
module.exports = app;