// Import modules
const express = require('express');
// ... other required modules

// Route for handling form submission
app.post('/booking', async (req, res) => {
  try {
    // Access form data
    const { name, email} = req.body;

    // Validate form data (implement validation logic)

    // Connect to MySQL (using the pool)
    const connection = await pool.getConnection();

    // Prepare SQL query (replace with actual table and fields)
    const query = `INSERT INTO bookings (name, email) VALUES (?, ?)`;

    // Execute query
    const [results] = await connection.query(query, [name, email]);

    // Handle successful booking
    res.redirect('/booking-confirmation'); // Assuming a confirmation page
  } catch (error) {
    console.error(error);
    // Handle database errors gracefully
    res.status(500).send('Error processing booking');
  } finally {
    connection.release(); // Release the connection back to the pool
  }
});