const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const https = require('https');
const fs = require('fs');


const app = express();
app.use(express.json());

mongoose.connect('mongodb://mongo:27017/taskdb', { useNewUrlParser: true, useUnifiedTopology: true });

const Task = mongoose.model('Task', new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}));

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send({ message: 'Token missing' });

  jwt.verify(token, 'secretKey', (err, decoded) => {
    if (err) return res.status(401).send({ message: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

app.post('/tasks', async (req, res) => {
  const { title, description } = req.body;
  const task = new Task({ title, description, userId: req.userId });
  await task.save();
  res.status(201).send(task);
});

app.get('/tasks', authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId });
  res.json(tasks);
});

app.put('/tasks/:id', authMiddleware, async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(task);
});

app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

const options = {
  key: fs.readFileSync('private.key'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(3001, () => {
  console.log('Task Service running on HTTPS port 3001');
});