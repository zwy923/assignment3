import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, List, ListItem, ListItemText, Grid, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import io from 'socket.io-client';

const socket = io('http://localhost:1234');

function Channels({ channels, joinChannel }) {
  return (
    <List>
      {channels.map((channel) => (
        <ListItem key={channel}>
          <ListItemText primary={channel} />
          <Button onClick={() => joinChannel(channel)} variant="contained">
            Join
          </Button>
        </ListItem>
      ))}
    </List>
  );
}

function App() { 
  const [nickname, setNickname] = useState('');
  const [channel, setChannel] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [hasNickname, setHasNickname] = useState(false);
  const [channelList, setChannelList] = useState([]);
  const [currentChannel, setCurrentChannel] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [privateChat, setPrivateChat] = useState({ open: false, recipient: '' });
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateMessage, setPrivateMessage] = useState('');

  
  useEffect(() => {
    if (hasNickname) {

      socket.emit('get-users');

      socket.on('update-users', (updatedUsers) => {
        setOnlineUsers(updatedUsers.filter((user) => user !== nickname));
      });

      // Emit an event to request the updated channel list
      socket.emit('get-channels');
      // Listen for the updated channel list
      socket.on('update-channels', (updatedChannels) => {
        setChannelList(updatedChannels);
      });
    }
  }, [hasNickname]);

  
  useEffect(() => {
    socket.on('receive-message', (user, msg) => {
      setMessages((prev) => [...prev, { user, msg }]);
    });

    socket.on('update-channels', (updatedChannels) => {
      setChannelList(updatedChannels);
    });

    socket.on('receive-private-message', (user, msg) => {
      setPrivateMessages((prev) => [...prev, { user, msg }]);
    });

    // Update the dependency array to include the socket object
    return () => {
      window.addEventListener('beforeunload', () => {
        socket.disconnect();
      });
    };
  }, []);

  // startPrivateChat function
  const startPrivateChat = (recipient) => {
    // Open the private chat dialog
    setPrivateChat({ open: true, recipient });
    // Remove previous receive-private-message listener
    socket.off('receive-private-message');

    // Listen for receive-private-message event
    socket.on('receive-private-message', (from, privateMsg) => {
      setPrivateMessages((prev) => [...prev, { user: from, msg: privateMsg }]);
    });
  };

  const handleClosePrivateChat = () => {
    setPrivateChat({ open: false, recipient: '' });
  };

  const handleNicknameChange = (e) => {
    setNickname(e.target.value);
  };

  const handleChannelChange = (e) => {
    setChannel(e.target.value);
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const setNick = () => {
    if (nickname !== '') {
      socket.emit('set-nickname', nickname);
      setHasNickname(true);
    }
  };

  const joinChannel = (channel) => {
    if (!channelList.includes(channel)) {
      setChannelList((prev) => [...prev, channel]);
    }
    setCurrentChannel(channel);

    // Remove previous chat-history listener
    socket.off('chat-history');
    socket.off('receive-message');

    // Add code to request chat history for the selected channel
    socket.emit('join-channel', channel);
    socket.on('chat-history', (history) => {
      setMessages(history);
    });

    // Listen for receive-message event
    socket.on('receive-message', (user, msg) => {
      setMessages((prev) => [...prev, { user, msg }]);
    });
  };

  const createChannel = () => {
    if (channel !== '') {
      socket.emit('create-channel', channel);
    }
  };
  
  const sendMessage = () => {
    if (message !== '' && currentChannel !== '') {
      socket.emit('send-message', currentChannel, message);
      setMessage('');
    }
  };

  const leaveChannel = () => {
    setCurrentChannel('');
  };


  const handlePrivateMessageChange = (e) => {
    setPrivateMessage(e.target.value);
  };

  const sendPrivateMessage = () => {
    if (privateMessage !== '' && privateChat.recipient !== '') {
      socket.emit('private-message', privateChat.recipient, privateMessage);
      setPrivateMessage('');
    }
  };

  const refreshOnlineUsers = () => {
    if (hasNickname) {
      socket.emit('get-users');
    }
  };

  return (
  <Container maxWidth="md">
     <>
      {/* Update Dialog component for private chat */}
      <Dialog onClose={handleClosePrivateChat} open={privateChat.open} fullWidth maxWidth="sm">
        <DialogTitle>Private Chat with {privateChat.recipient}</DialogTitle>
        <DialogContent>
          <List>
            {privateMessages.map((msgObj, index) => (
              <ListItem key={index}>
                <ListItemText primary={`[${msgObj.user}]: ${msgObj.msg}`} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <TextField
            label="Message"
            value={privateMessage}
            onChange={handlePrivateMessageChange}
            variant="outlined"
            fullWidth
            style={{ marginBottom: '16px' }}
          />
          <Button onClick={sendPrivateMessage} variant="contained">
            Send
          </Button>
        </DialogActions>
      </Dialog>
      {/* ... */}
    </>
    <Grid container spacing={3}>
      <Grid item xs={12} sm={4}>
        {!hasNickname && (
          <TextField
            label="Nickname"
            value={nickname}
            onChange={handleNicknameChange}
            variant="outlined"
            fullWidth
            style={{ marginBottom: '16px' }}
          />
        )}
        {hasNickname && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Nickname: {nickname}
            </Typography>
            <Typography variant="h6" gutterBottom>
              Online Users
            </Typography>
            <Grid item>
          <Button variant="contained" onClick={refreshOnlineUsers}>
            Refresh
          </Button>
        </Grid>
            <List>
              {onlineUsers.map((user, index) => (
                <ListItem key={index}>
                  <ListItemText primary={user} />
                  {/* Add a button for private chat */}
                  <Button
                    onClick={() => startPrivateChat(user)}
                    variant="contained"
                    color="primary"
                  >
                    Chat
                  </Button>
                </ListItem>
              ))}
            </List>
          </>
        )}
        {!hasNickname && (
          <Button onClick={setNick} variant="contained">
            Set Nickname
          </Button>
        )}
      </Grid>
      <Grid item xs={12} sm={8}>
        {!currentChannel && (
          <>
            <TextField
              label="Channel"
              value={channel}
              onChange={handleChannelChange}
              variant="outlined"
              fullWidth
              style={{ marginBottom: '16px' }}
            />
            <Button onClick={createChannel} variant="contained" disabled={!hasNickname}>
              Create Channel
            </Button>
            <Channels channels={channelList} joinChannel={joinChannel} />
          </>
        )}
        {currentChannel && (
          <>
            <Typography variant="h6" gutterBottom>
              Current Channel: {currentChannel}
            </Typography>
            <TextField
              label="Message"
              value={message}
              onChange={handleMessageChange}
              variant="outlined"
              fullWidth
              style={{ marginBottom: '16px' }}
            />
            <Button onClick={sendMessage} variant="contained">
              Send
            </Button>
            <List>
              {messages.map((msgObj, index) => (
                <ListItem key={index}>
                  <ListItemText primary={`[${msgObj.user}]: ${msgObj.msg}`} />
                </ListItem>
              ))}
            </List>
            <Button onClick={leaveChannel} variant="contained">
              Leave Channel
            </Button>
          </>
        )}
      </Grid>
    </Grid>
  </Container>
);

}

export default App;
           

