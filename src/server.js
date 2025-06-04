const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./configs/dbConfig');

// Khai báo routes
const student = require('./routes/studentRoute');
const parent = require("./routes/parentRoute");

// Khai báo dotenv
dotenv.config();

// Khai báo app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); 

// Connect to MongoDB
connectDB();

// Sử dụng đường dẫn
app.use("/api/student",student); 
app.use("/api/parent", parent);

// route test
app.get('/', (req, res) => {
  res.send('👋 Welcome to the Kindergarten Management API');
});


// Start server
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
