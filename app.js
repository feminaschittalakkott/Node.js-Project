const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// Apply body-parser middleware
app.use(bodyParser.urlencoded({ extended: false }));

const port = 3000;

// Database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'training',
});

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: '',
    pass: '',
  },
});

// View engine setup (assuming EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, 'css')));

// Body parser middleware
app.use(express.urlencoded({ extended: false }));

// Route for homepage
app.get('/', (req, res) => {
  res.render('index');
});
// Route for bookingpage



// Route for booking form
app.get('/booking_form', (req, res) => {
  // Fetch available courses from database
  pool.query('SELECT * FROM courses', (err, courses) => {
    if (err) {
      console.error(err);
      res.render('error'); // Handle error
    } else {
      // Render booking form with available courses
      res.render('booking_form', { courses });
    }
  });
});

// Route for form submission (replace with actual logic)
app.post('/submit_booking', (req, res) => {
  const { name, email, designation, company, course, date, time } = req.body;
  // Validate user input
  // Sanitize user input
  // Insert booking data into database
  pool.query('INSERT INTO booking (name, email, designation, company, course, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, email, designation, company, course, date, time], (err) => {
    if (err) {
      console.error(err);
      res.render('error'); // Handle error
    } else {
      const mailOptions = {
        from: 'ferisworld@outlook.com',
        to: email,
        subject: 'Training Booking Confirmation',
        text: `Dear ${name},\n\nThank you for booking the training session. Your booking has been confirmed for ${date} at ${time}.`,
      };
      // Redirect to success page
      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error(error);
            res.render('error'); // Render the error view
          } else {
            console.log('Email sent: ' + info.response);
            res.render('book_confirm');
          }
        });
    }
  });
});

app.get('/booking_details', (req, res) => {
  pool.query('SELECT * FROM booking', (err, bookings) => {
    if (err) {
      console.error(err);
      res.render('error');
    } else {
      res.render('booking_details', { bookings });
    }
  });
});

// Other routes and functionality...

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});