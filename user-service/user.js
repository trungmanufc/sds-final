const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(express.json());

mongoose.connect('mongodb://mongo:27017/userdb', { useNewUrlParser: true, useUnifiedTopology: true });

const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true }
}));

app.post('/users/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();
  res.status(201).send({ message: 'User registered successfully!' });
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