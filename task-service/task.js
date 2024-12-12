const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const https = require('https');
const fs = require('fs');


const app = express();
const userServiceUrl = "http://user-service.default.svc.cluster.local/users/";
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://mongo:27017/taskdb', { useNewUrlParser: true, useUnifiedTopology: true });

// Task model
const Task = mongoose.model('Task', new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  userId: { type: Number, required: true }
}));

async function verifyUser(userId) {
  try {
    const response = await axios.get(`${userServiceUrl}/${userId}`);

    // If user is valid, return user data
    return response.data;
  } catch (error) {
    // Handle the error (e.g., user not found, invalid token)
    throw new Error("User validation failed");
  }
}


// POST /tasks - Create a new task
app.post('/tasks', async (req, res) => {
  const { title, description, userNumber } = req.body;
  if (!title) return res.status(400).send({ message: 'Title is required' });

  const user = await verifyUser(userNumber);

  try {
    const task = new Task({ title, description, userNumber });
    await task.save();
    res.status(201).send(task);
  } catch (err) {
    res.status(500).send({ message: 'Error creating task', error: err.message });
  }
});

// GET /tasks - Get tasks for the user
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching tasks', error: err.message });
  }
});

// PUT /tasks/:id - Update a task
app.put('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(500).send({ message: 'Error updating task', error: err.message });
  }
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ message: 'Error deleting task', error: err.message });
  }
});

// HTTPS options (using certificates)
const options = {
  key: fs.readFileSync('private.key'),
  cert: fs.readFileSync('cert.pem')
};

// Create the HTTPS server
https.createServer(options, app).listen(3001, () => {
  console.log('Task Service running on HTTPS port 3001');
});