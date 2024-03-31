const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const WebSocket = require('ws');
const cookie = require('cookie');
const cookieParser = require('cookie-parser');

const errorController = require('./controllers/error');
const sendingDataController = require('./controllers/sending-data');

const sendingData = require('./controllers/sending-data');
const eventEmitter = sendingData.eventEmitter;

const User = require('./models/user');
require('dotenv').config()
console.log(process.env)

// const MONGODB_URI = 
//     'mongodb+srv://mszczerkovski:Allegro123@cluster0.xbb7pka.mongodb.net/PredicTech';


const app = express();

const store = new MongoDBStore({
    uri: process.env.MONGODB_CONNECT_URI,
    databaseName: 'PredicTech',
    collection: 'sessions'
  },
  (err) => {
    if (err) {
      console.error('Error connecting to MongoDB:', err);
    }

  });

const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views');

const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const user = require('./models/user');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// app.use(
//     session({
//         secret: 'A80rR(WMAO@wWwh9NttfRHuB', 
//         resave: false, 
//         saveUninitialized: false,
//         store: store
// }));

const sessionParser = session({
  secret: 'A80rR(WMAO@wWwh9NttfRHuB', 
  resave: false, 
  saveUninitialized: false,
  store: store
});

app.use(sessionParser);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
  });

app.use((req, res, next) => {
    if (!req.session.user) {
      return next();
    }
    User.findById(req.session.user._id)
      .then(user => {
        if (!user) {
          return next();
        }
        req.user = user;
        next();
      })
      .catch(err => {
        next(new Error(err));
      });
});

app.use(userRoutes);
app.use(authRoutes);

app.use(errorController.get404);

const wsmap = new Map();

mongoose.connect(process.env.MONGODB_CONNECT_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');

    // Create HTTP server
    const server = app.listen(process.env.PORT || 3000, () => {
      console.log('Express server listening on port 3000');
    });

    const wss = new WebSocket.Server({clientTracking: false, noServer: true, path: '/ws'});

    server.on('upgrade', (req, socket, head) => {
      sessionParser(req, {}, () => {
        if (!req.session.user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      });
    }
    );
    eventEmitter.on('data', (userId, message) => {
        console.log('Connected user:', userId);
        if (!wsmap[userId] || wsmap[userId].readyState === undefined || wsmap[userId].readyState !== WebSocket.OPEN) {
          console.log('User not connected');
          return;
        }
        wsmap[userId].send(JSON.stringify(message));
    });
    // Handle WebSocket connections
    wss.on('connection', (ws, req) => {
      console.log('Client connected');

      const userIdExpected = req.session.user._id.toString();
      wsmap[userIdExpected] = ws;
      console.log('Current user:', userIdExpected);
      // Handle WebSocket messages
      ws.on('message', (message) => {
        console.log('Received message from client:', message);
      });
    
    });

    wss.on('close', (ws, req) => {
      wsmap.delete(req.session.user._id.toString());
      console.log('Client disconnected');
    });

    wss.on('error', (ws, req) => {
      wsmap.delete(req.session.user._id.toString());
      console.log('wss error');
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });