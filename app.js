const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('express-flash');
const LocalStrategy = require('passport-local').Strategy;
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const secretKey = crypto.randomBytes(32).toString('hex');

const app = express();

// Use express-session for session management
app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true,
}));
// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Apply body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());

const port = 3000;

// Database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'training',
});

// Configure passport
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      // Replace this with your actual user authentication logic
      const userQuery = 'SELECT * FROM users WHERE username = ?';
      pool.query(userQuery, [username], async (err, results) => {
        if (err) {
          return done(err);
        }

        if (results.length === 0) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        const user = results[0];

        // Compare the hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (isPasswordMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Incorrect username or password.' });
        }
      });
    } catch (error) {
      console.error(error);
      return done(error);
    }
  }
));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Replace this with your actual logic to retrieve user from the database by ID
  const userQuery = 'SELECT * FROM users WHERE id = ?';
  pool.query(userQuery, [id], (err, results) => {
    if (err) {
      return done(err);
    }

    if (results.length === 0) {
      return done(null, false);
    }

    const user = results[0];
    return done(null, user);
  });
});


const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ferisworld@outlook.com',
    pass: 'feris@2218',
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
app.get('/welcome', ensureAuthenticated, (req, res) => {
  res.render('index', { currentPage: 'home' });
});
// Route for bookingpage


// Route for login page
app.get('/', (req, res) => {
  res.render('login');
});

// Route for handling login form submission
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/welcome',
    failureRedirect: '/',
    failureFlash: true,
  })
);

// Route for registration page
app.get('/register', (req, res) => {
  res.render('register');
});

// Route for handling registration form submission
app.post('/register', [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters.'),
  body('passwordConfirmation').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match.');
    }
    return true;
  }),
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Invalid email address.').normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render('register', { errors: errors.array() });
  }

  const { username, password, name, email } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)';

    pool.query(sql, [username, hashedPassword, name, email], (err, result) => {
      if (err) {
        console.error(err);
        return res.render('error', { message: 'Error occurred during registration.' });
      }

      res.redirect('/');
    });
  } catch (error) {
    console.error(error);
    return res.render('error', { message: 'Error occurred during registration.' });
  }
});

// Route for handling logout
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.render('error'); // Handle error
    }
    res.redirect('/');
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/'); // Redirect to login if not authenticated
}


// Route for booking form
app.get('/booking_form', ensureAuthenticated, (req, res) => {
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
  const { co_name, co_email, phone, date, address, course, t_date, coursedur, noofattendee, costper, delegateName, delegateEmail, delegateContact } = req.body;

  pool.query('INSERT INTO booking (co_name, co_email, phone, date, address, course, t_date, course_dur, no_of_attendees, cost_per) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [co_name, co_email, phone, date, address, course, t_date, coursedur, noofattendee, costper], (err, results) => {
    if (err) {
      console.error(err);
      res.render('error'); // Handle error
    } else {
      const book_id = results.insertId;

      if (Array.isArray(delegateName) && Array.isArray(delegateEmail) && Array.isArray(delegateContact)) {
        let delegateInsertionCount = 0;

        // Loop through the arrays to process each delegate
        for (let i = 0; i < delegateName.length; i++) {
          const currentDelegateName = delegateName[i];
          const currentDelegateEmail = delegateEmail[i];
          const currentDelegateContact = delegateContact[i];

          pool.query('INSERT INTO delegates (book_id, d_name, d_email, d_contact) VALUES (?, ?, ?, ?)', [book_id, currentDelegateName, currentDelegateEmail, currentDelegateContact], (delegateErr) => {
            if (delegateErr) {
              console.error(delegateErr);
              res.render('error'); // Handle error
            } else {
              console.log('Delegate information inserted successfully:', currentDelegateName);

              delegateInsertionCount++;

              // Check if all delegate insertions are complete before rendering the response
              if (delegateInsertionCount === delegateName.length) {
                const mailOptions = {
                  from: 'ferisworld@outlook.com',
                  to: co_email,
                  subject: 'Training Booking Confirmation',
                  text: `Dear ${co_name},\n\nThank you for booking the training session. Your booking has been confirmed for ${t_date}`,
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
            }
          });
        }
      }
    }
  });
});

app.get('/booking_details', ensureAuthenticated, (req, res) => {
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