const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(express.json());

mongoose.connect('mongodb://mongo:27017/userdb', { useNewUrlParser: true, useUnifiedTopology: true });

const counterSchema = new mongoose.Schema({
  count: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  userNumber: { type: Number, unique: true } 
});

userSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // Look for the counter document and increment the count
      const counter = await Counter.findOneAndUpdate(
        {},  // Empty object means we'll update the first document found
        { $inc: { count: 1 } }, // Increment the count
        { new: true, upsert: true } // Create the document if it doesn't exist
      );

      this.userNumber = counter.count; // Assign the incremented count to userNumber
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const User = mongoose.model('User', userSchema);

app.post('/users/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  try {
    await user.save();
    res.status(201).send({ message: 'User registered successfully!',
      userNumber: user.userNumber,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    res.status(500).send({ message: 'Error registering user', error: error.message });
  }

});


// Get user by userNumber endpoint
app.get('/users/:userNumber', async (req, res) => {
  const { userNumber } = req.params;

  try {
    const user = await User.findOne({ userNumber });
    if (!user) {
      return res.status(404).send({ message: `User with userNumber ${userNumber} not found` });
    }

    res.status(200).send({
      userNumber: user.userNumber,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    res.status(500).send({ message: 'Error fetching user data', error: error.message });
  }
});

app.post('/users/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send({ message: 'Invalid credentials' });
    }
  
    const token = jwt.sign({ userId: user._id }, 'secretKey');
    res.json({ token });
  });

  const options = {
    key: fs.readFileSync('private.key'),
    cert: fs.readFileSync('cert.pem')
  };

  https.createServer(options, app).listen(3000, () => {
    console.log('User Service running on HTTPS port 3000');
  });