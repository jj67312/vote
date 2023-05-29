const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Set up body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Set up express-session middleware
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
  })
);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define user schema and model
const userSchema = new mongoose.Schema({
  username: String,
  aadhar: String,
  selectedInput: String,
});
const User = mongoose.model('User', userSchema);

// Define routes
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index', { message: '' });
});

app.get('/register', (req, res) => {
  res.render('register', { message: '' });
})

app.post('/login', async (req, res) => {
  const { username, aadhar } = req.body;

  try {
    const user = await User.findOne({ username, aadhar }).exec();
    if (user) {
      if (user.selectedInput) {
        res.render('dashboard', { username: user.username, message: 'Already voted', alreadyVoted: true });
      } else {
        req.session.username = username;
        res.render('dashboard', { username: user.username, message: 'Not voted', alreadyVoted: false });
        // res.redirect( {username: req.session.username, alreadyVoted: false}, '/dashboard');
      }
    } else {
      res.render('index', { message: 'Invalid username or Aadhaar number' });
    }
  } catch (err) {
    console.error(err);
    res.render('index', { message: 'An error occurred' });
  }
});

app.post('/register', async (req, res) => {
  const { username, aadhar } = req.body;

  try {
    const existingUser = await User.findOne({ username }).exec();
    if (existingUser) {
      res.render('index', {
        message: 'Username already exists. Please choose a different username.',
      });
    } else {
      const newUser = new User({ username, aadhar });
      await newUser.save();
      res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    res.render('index', { message: 'An error occurred' });
  }
});

app.get('/dashboard', async (req, res) => {
  if (req.session.username) {
    try {
      const user = await User.findOne({
        username: req.session.username,
      }).exec();
      if (user.selectedInput) {
        console.log('target hit')
        res.render('dashboard', {
          username: req.session.username,
          alreadyVoted: true,
        });
      } else {
        res.render('dashboard', {
          username: req.session.username,
          alreadyVoted: false,
        });
      }
    } catch (err) {
      console.error(err);
      res.render('dashboard', {
        username: req.session.username,
        alreadyVoted: false,
      });
    }
  } else {
    res.redirect('/');
  }
});

app.post('/vote', async (req, res) => {
  const { inputField } = req.body;

  try {
    await User.findOneAndUpdate(
      { username: req.session.username },
      { selectedInput: inputField }
    ).exec();
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('dashboard', {
      username: req.session.username,
      alreadyVoted: false,
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Start the server
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
