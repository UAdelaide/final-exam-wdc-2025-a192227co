var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
    try {
        // Connect to MySQL without specifying a database
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '' // Set your MySQL root password
        });

        // Create the database if it doesn't exist
        await connection.query('CREATE DATABASE IF NOT EXISTS DogWalk');
        await connection.end();

        // Now connect to the created database
        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'DogWalk'
        });

        // Create a table if it doesn't exist

        await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await db.execute(`
      CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        size ENUM('small', 'medium', 'large') NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);

        await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRequests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    dog_id INT NOT NULL,
    requested_time DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    location VARCHAR(255) NOT NULL,
    status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
    )
    `);

        await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRatings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    walker_id INT NOT NULL,
    owner_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
    FOREIGN KEY (walker_id) REFERENCES Users(user_id),
    FOREIGN KEY (owner_id) REFERENCES Users(user_id),
    CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
    )
    `);

        // Insert data if table is empty
        const [Users] = await db.execute('SELECT COUNT(*) AS count FROM Users');
        if (Users[0].count === 0) {
            await db.execute(`
        INSERT INTO Users (username, email, password_hash, role)
        VALUES
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('benstilton', 'ben@example.com', 'hashed389', 'owner'),
        ('tenny123', 'tenny@example.com', 'hashed491', 'owner');
      `);
        }

        const [Dogs] = await db.execute('SELECT COUNT(*) AS count FROM Dogs');
        if (Dogs[0].count === 0) {
            await db.execute(`
        INSERT INTO Dogs (name, size, owner_id)
        VALUES
        ('Max', 'medium', 3),
        ('John', 'small', 1),
        ('Tim', 'medium', 2);
      `);
        }

        const [WalkRequests] = await db.execute('SELECT COUNT(*) AS count FROM WalkRequests');
        if (WalkRequests[0].count === 0) {
            await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        VALUES
        ((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'John'), '2025-08-10 7:40:00', 15, 'Carrot Ave', 'completed'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Tim'), '2025-04-10 11:00:00', 35, 'Parsley Road', 'accepted');
      `);
        }

    } catch (err) {
        console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
    }
})();

// Route to return books as JSON
app.get('/', async (req, res) => {
    try {
        const [books] = await db.execute('SELECT * FROM books');
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;

app.get('/api/dogs', async (req, res) => {
    try {
        const [Dogs] = await db.execute(`
            SELECT
              dog.name AS dogName,
              dog.size,
              user.username AS ownerUsername
            FROM Dogs dog
            Join Users user ON dog.owner_id = user.user_id
        `);
        res.json(Dogs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch dogs' });
    }
});

app.get('/api/walkrequests/open', async (req, res) => {
    try {
        const [WalkRequests] = await db.execute(`
            SELECT
              dog.name AS dogName,
              dog.size,
              user.username AS ownerUsername
            FROM Dogs dog
            Join Users user ON dog.owner_id = user.user_id
        `);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch walk requests' });
    }
});



