const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const multer = require('multer');
const routes = require('./routes');
const connection = require('./db');
const path = require('path');
const { title } = require('process');
const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(expressLayouts);
app.set('layout', 'layouts/layout');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'ee4a8dd93bf1a6f6f73ac6167a98da599f680fce0c0d78b7c27a8240f28a57b9',
    resave: true,
    saveUninitialized: true
  }));
// Configure Passport middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());




// Use your routes
app.use('/api', routes);



// Function to retrieve user by username from the database
function getUserByUsername(username, callback) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    connection.query(sql, [username], (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        callback(null, result[0]); // Pass the user object to the callback
      } else {
        callback(null, null); // User not found
      }
    });
  }
  // Function to retrieve user by ID from the database
function getUserById(id, callback) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    connection.query(sql, [id], (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        callback(null, result[0]); // Pass the user object to the callback
      } else {
        callback(new Error('User not found'), null); // User not found error
      }
    });
  }
  //usage:
  passport.use(new LocalStrategy(
    (username, password, done) => {
      getUserByUsername(username, (err, user) => {
        if (err) return done(err);
        if (!user || user.password !== password) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        return done(null, user);
      });
    }
  ));
  // Serialize and deserialize user
 // Configure Passport.js serialization and deserialization
passport.serializeUser((user, done) => {
    done(null, user.id); // Serialize user ID to the session
  });
  
  passport.deserializeUser((id, done) => {
    getUserById(id, (err, user) => {
      done(err, user); // Deserialize user object from the session
    });
  });




// Assuming you have a route to handle admin login
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    // Validate admin credentials and retrieve admin ID
    const adminId = getAdminIdByUsername(username);
    if (adminId) {
      req.session.adminId = adminId; // Store admin ID in session
      res.redirect('/dashboard'); // Redirect to dashboard after successful login
    } else {
      res.redirect('/admin-login'); // Redirect back to admin login page on failure
    }
  });


app.get('/register', (req, res) => {
    res.render('register', { title: 'Register', layout: false });
  });

  app.get('/login', (req, res) => {
    res.render('login', { title: 'Login', layout: false });
  });

  app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const sql = 'INSERT INTO admins (username, password) VALUES (?, ?)';
    connection.query(sql, [username, password], (err, result) => {
      if (err) throw err;
      res.send('Admin registered successfully');
    });
  });

  app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sqlAdmin = 'SELECT * FROM admins WHERE username = ? AND password = ?';
    const sqlUser = 'SELECT * FROM users WHERE username = ? AND password = ?';
  
    // Check if the user is an admin
    connection.query(sqlAdmin, [username, password], (err, adminResult) => {
      if (err) throw err;
      if (adminResult.length > 0) {
        // Admin authentication successful
        req.session.username = username;
        req.session.authenticated = true; // Set session variable for admin
        res.redirect('/dashboard'); // Redirect admin to dashboard
      } else {
        // Check if the user is a regular user
        connection.query(sqlUser, [username, password], (err, userResult) => {
          if (err) throw err;
          if (userResult.length > 0) {
            // Regular user authentication successful
            req.session.username = username;
            req.session.authenticated = true; // Set session variable for user
            res.redirect('/dashboard'); // Redirect user to dashboard
          } else {
            // Authentication failed for both admin and user
            res.send('Invalid username or password');
          }
        });
      }
    });
  });

  app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) throw err;
      res.redirect('/login');
    });
  });

  // Define requireAuth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
      // If the user is authenticated, proceed to the next middleware/route handler
      next();
    } else {
      // If not authenticated, redirect to the login page or handle unauthorized access
      res.redirect('/login'); // Redirect to the login page
    }
  }

// render dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    const { username } = req.session; // Assuming username is stored in the session
    console.log(username); 
    res.render('dashboard', {title:'dashboard', username });
  });






//crud for creating users
  
app.post('/users', (req, res) => {
    const { username, password } = req.body;
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    connection.query(sql, [username, password], (err, result) => {
      if (err) {
        res.status(500).send('Error adding user');
      } else {
        res.redirect('/users'); // Redirect to user list page after successful insertion
      }
    });
  });
  
  // Update User Route
app.post('/users/update/:id', (req, res) => {
    const userId = req.params.id;
    const { username, password } = req.body;
    const sql = 'UPDATE users SET username = ?, password = ? WHERE id = ?';
    connection.query(sql, [username, password, userId], (err, result) => {
      if (err) {
        res.status(500).send('Error updating user');
      } else {
        res.redirect('/users'); // Redirect back to the users list
      }
    });
  });

  // Delete User Route
app.post('/users/delete/:id', (req, res) => {
    const userId = req.params.id;
    const sql = 'DELETE FROM users WHERE id = ?';
    connection.query(sql, [userId], (err, result) => {
      if (err) {
        res.status(500).send('Error deleting user');
      } else {
        res.redirect('/users'); // Redirect back to the users list
      }
    });
  });
  

  // Route to fetch users from database and render users.ejs
  app.get('/users', (req, res) => {
    const sqlAdmins = 'SELECT * FROM admins';
    const sqlUsers = 'SELECT * FROM users';
    connection.query(sqlAdmins, (errAdmins, admins) => {
      if (errAdmins) {
        res.status(500).send('Error fetching admins');
      } else {
        connection.query(sqlUsers, (errUsers, users) => {
          if (errUsers) {
            res.status(500).send('Error fetching users');
          } else {
            res.render('users', { title: 'Manage Users', admins, users });
          }
        });
      }
    });
  });
  
  
  app.get('/add-user',(req, res) => {
    res.render('addUser', { title:'adduser' });
  });
  

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.session.authenticated && req.session.role === 'admin') {
      // User is authenticated and is an admin, proceed to the next middleware
      next();
    } else {
      // User is not an admin, redirect or handle as needed
      res.status(403).send('Access Forbidden');
    }
  }
  // Example restricted route
app.get('/dashboard', isAdmin, (req, res) => {
    // This route will only be accessible by admins
    res.render('admin_dashboard', { title: 'Admin Dashboard' });
  });





// Route to render employee form
app.get('/employees/new', (req, res) => {
    connection.query('SELECT * FROM departments', (error, results) => {
        if (error) {
            console.error('Error fetching departments:', error);
            res.send('Error fetching departments data.');
            return;
        }
        res.render('employeeForm', { title:'Add Employee', departments: results });
    });
});

// Handle form submission to add new employee
app.post('/employees', (req, res) => {
    const { firstName, lastName, middleName, address, department, email, status, employeeNumber } = req.body;
    
    // Convert status to integer (0 for false, 1 for true)
    const statusInt = status === 'true' ? 1 : 0;
    
    const employeeData = { firstName, lastName, middleName, address, department, email, status: statusInt, employeeNumber };

    connection.query('INSERT INTO employees SET ?', employeeData, (error, results) => {
        if (error) {
            console.error('Error inserting employee:', error);
            res.status(500).send('Error inserting employee data: ' + error.message);
            return;
        }
        console.log('Employee added:', results);
        res.redirect('/employees');
    });
});


// Route to render the list of employees
app.get('/employees', (req, res) => {
    const query = `
        SELECT employees.*, departments.name AS departmentName
        FROM employees
        JOIN departments ON employees.department = departments.id
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching employees:', error);
            res.send('Error fetching employees data.');
            return;
        }
        res.render('employees', { title: 'Employess', employees: results });
    });
});

// Route to render edit employee form
app.get('/employees/:id/edit', (req, res) => {
    const { id } = req.params;

    connection.query('SELECT * FROM employees WHERE id = ?', id, (error, results) => {
        if (error || results.length === 0) {
            console.error('Error fetching employee for edit:', error);
            res.send('Employee not found.');
            return;
        }

        // Fetch departments for dropdown
        connection.query('SELECT * FROM departments', (deptError, deptResults) => {
            if (deptError) {
                console.error('Error fetching departments:', deptError);
                res.send('Error fetching departments data.');
                return;
            }

            res.render('editEmployee',  { title: 'editDepartment', employee: results[0], departments: deptResults });
        });
    });
});


// Route to handle form submission for updating employee details
app.post('/employees/:id', (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, middleName, address, email, status, employeeNumber } = req.body;

    // Convert status to integer (0 or 1)
    const statusInt = status === 'true' ? 1 : 0;

    connection.query(
        'UPDATE employees SET firstName = ?, lastName = ?, middleName = ?, address = ?, email = ?, status = ?, employeeNumber = ? WHERE id = ?', 
        [firstName, lastName, middleName, address, email, statusInt, employeeNumber, id], 
        (error, results) => {
            if (error) {
                console.error('Error updating employee:', error);
                res.status(500).send('Error updating employee.');
                return;
            }
            console.log('Employee updated:', results);
            res.redirect('/employees');
        }
    );
});


// GET route to fetch employee names and status from MySQL employees table
app.get('/employeeStatus', (req, res) => {
    connection.query('SELECT CONCAT(firstName, " ", IFNULL(middleName, ""), " ", lastName) AS fullName, status, employeeNumber FROM employees', (error, results) => {
        if (error) {
            console.error('Error fetching employee names:', error);
            res.status(500).send('Error fetching employee names: ' + error.message);
            return;
        }
        console.log('Employee names fetched:', results);
        res.render('employeeStatus', {title:'status' ,employees: results });
    });
});

// POST route to update employee status
app.post('/updateStatus/:employeeNumber', (req, res) => {
    const employeeNumber = req.params.employeeNumber;
    const newStatus = req.body.status === '1' ? 1 : 0;

    connection.query('UPDATE employees SET status = ? WHERE employeeNumber = ?', [newStatus, employeeNumber], (error, results) => {
        if (error) {
            console.error('Error updating status:', error);
            res.status(500).send('Error updating status: ' + error.message);
            return;
        }
        console.log('Status updated for employee:', employeeNumber);
        res.redirect('/employeeStatus'); // Redirect to the employee list page
    });
});

// Function to fetch employees' full names from the database
function fetchEmployeesFromDatabase(callback) {
    connection.query('SELECT CONCAT(lastName, ", ", IFNULL(firstName, ""), " ", IFNULL(middleName, "")) AS fullName FROM employees', (error, results) => {
        if (error) {
            console.error('Error fetching employees:', error);
            callback(error, null);
        } else {
            callback(null, results);
        }
    });
}

// GET route to render salary setup page
app.get('/salarySetup', (req, res) => {
    fetchEmployeesFromDatabase((error, employees) => {
        if (error) {
            res.status(500).send('Error fetching employees from database');
        } else {
            res.render('salarySetup', {title:'salaries', employees });
        }
    });
});



// POST route to add new salary
app.post('/addSalary', (req, res) => {
    const { employeeName, salary, bonus, deductions, taxes } = req.body;
    
    // Insert the salary data into the database
    // You would need to modify this part to fit your database schema
    connection.query('INSERT INTO salaries (employeeName, salary, bonus, deductions, taxes) VALUES (?, ?, ?, ?, ?)', 
        [employeeName, salary, bonus, deductions, taxes], 
        (error, results) => {
            if (error) {
                console.error('Error adding salary:', error);
                res.status(500).send('Error adding salary: ' + error.message);
                return;
            }
            console.log('Salary added:', results);
            res.redirect('/salarySetup'); // Redirect back to the salary setup page
        }
    );
});

// POST route to edit existing salary
app.post('/editSalary', (req, res) => {
    const { employeeName, newSalary, newBonus, newDeductions, newTaxes } = req.body;
    
    // Update the salary data in the database based on employee name
    // You would need to modify this part to fit your database schema
    connection.query('UPDATE salaries SET salary = ?, bonus = ?, deductions = ?, taxes = ? WHERE employeeName = ?', 
        [newSalary, newBonus, newDeductions, newTaxes, employeeName], 
        (error, results) => {
            if (error) {
                console.error('Error updating salary:', error);
                res.status(500).send('Error updating salary: ' + error.message);
                return;
            }
            console.log('Salary updated:', results);
            res.redirect('/salarySetup'); // Redirect back to the salary setup page
        }
    );
});


// departments
app.post('/departments', (req, res) => {
    const { departmentName } = req.body;

    connection.query('INSERT INTO departments (name) VALUES (?)', [departmentName], (error, results) => {
        if (error) {
            console.error('Error adding department:', error);
            res.send('Error adding department.');
            return;
        }
        console.log('Department added:', results);
        res.redirect('/departments');
    });
});

// Route to render department edit form
app.get('/departments/:id/edit', (req, res) => {
    const { id } = req.params;

    connection.query('SELECT * FROM departments WHERE id = ?', id, (error, results) => {
        if (error || results.length === 0) {
            console.error('Error fetching department for edit:', error);
            res.send('Department not found.');
            return;
        }
        res.render('editDepartment', { title: 'editDepartment', department: results[0] });
    });
});

// Route to handle department update (PUT request)
app.put('/departments/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    connection.query('UPDATE departments SET name = ? WHERE id = ?', [name, id], (error, results) => {
        if (error) {
            console.error('Error updating department:', error);
            res.send('Error updating department.');
            return;
        }
        console.log('Department updated:', results);
        res.redirect('/departments');
    });
});

// Route to handle department deletion (DELETE request)
app.delete('/departments/:id', (req, res) => {
    const { id } = req.params;

    connection.query('DELETE FROM departments WHERE id = ?', id, (error, results) => {
        if (error) {
            console.error('Error deleting department:', error);
            res.send('Error deleting department.');
            return;
        }
        console.log('Department deleted:', results);
        res.redirect('/departments');
    });
});

// Route to render departments view and fetch existing departments
app.get('/departments', (req, res) => {
    connection.query('SELECT * FROM departments', (error, results) => {
        if (error) {
            console.error('Error fetching departments:', error);
            res.send('Error fetching departments data.');
            return;
        }
        res.render('departments', { title:'Departments', departments: results });
    });
});

app.get('/countries', (req, res) => {
  res.render('createCountry', {title:'country'});
});

app.get('/cities', async (req, res) => {
  try {
      const countries = await getCountries(); // Fetch countries from the database
      res.render('createCity', {title:'cities', countries });
  } catch (error) {
      console.error('Error fetching countries:', error);
      res.status(500).send('Error fetching countries');
  }
});

// Route to handle country creation form submission
app.post('/countries', (req, res) => {
  const { countryName } = req.body;

  const sql = 'INSERT INTO countries (name) VALUES (?)';
  connection.query(sql, [countryName], (err, result) => {
      if (err) {
          console.error('Error creating country:', err);
          res.status(500).send('Error creating country');
          return;
      }
      console.log('Country created successfully');
  });
});


// Route to handle city creation form submission
app.post('/cities', async (req, res) => {
  const { cityName, countryId } = req.body;

  try {
      // Insert the new city into the database
      await queryAsync('INSERT INTO cities (name, country_id) VALUES (?, ?)', [cityName, countryId]);
      console.log('City created successfully');
  } catch (error) {
      console.error('Error creating city:', error);
      res.status(500).send('Error creating city');
  }
  res.send('city added')
});
// Helper function to run queries asynchronously
function queryAsync(sql, values) {
  return new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
          if (err) {
              reject(err);
              return;
          }
          resolve(result);
      });
  });
}
// Function to fetch countries from the database
async function getCountries() {
  return new Promise((resolve, reject) => {
      const sql = 'SELECT id, name FROM countries';
      connection.query(sql, (err, results) => {
          if (err) {
              reject(err);
              return;
          }
          resolve(results);
      });
  });
}
// Function to fetch a country by ID from the database
async function getCountryById(countryId) {
  return new Promise((resolve, reject) => {
      const sql = 'SELECT id, name FROM countries WHERE id = ?';
      connection.query(sql, [countryId], (err, result) => {
          if (err) {
              reject(err); // Reject the promise if there's an error
              return;
          }
          if (result.length === 0) {
              resolve(null); // Resolve with null if country is not found
          } else {
              resolve(result[0]); // Resolve with the country data
          }
      });
  });
}
// Route to render the countries and cities page
app.get('/locations', async (req, res) => {
  try {
      const countries = await getCountriesWithCities(); // Fetch countries with their cities
      res.render('locations', {title:'locations', countries });
  } catch (error) {
      console.error('Error fetching countries and cities:', error);
      res.status(500).send('Error fetching countries and cities');
  }
});
// Function to fetch countries with their cities from the database
async function getCountriesWithCities() {
  return new Promise((resolve, reject) => {
      const sql = `
          SELECT c.id AS country_id, c.name AS country_name, ci.id AS city_id, ci.name AS city_name
          FROM countries c
          LEFT JOIN cities ci ON c.id = ci.country_id
          ORDER BY c.id, ci.id
      `;
      connection.query(sql, (err, results) => {
          if (err) {
              reject(err);
              return;
          }

          const countries = [];
          let currentCountry = null;

          results.forEach(row => {
              if (!currentCountry || currentCountry.id !== row.country_id) {
                  currentCountry = {
                      id: row.country_id,
                      name: row.country_name,
                      cities: []
                  };
                  countries.push(currentCountry);
              }

              if (row.city_id) {
                  currentCountry.cities.push({
                      id: row.city_id,
                      name: row.city_name
                  });
              }
          });

          resolve(countries);
      });
  });
}

// Route to render the update country form
app.get('/countries/:id/edit', async (req, res) => {
  const countryId = req.params.id;

  try {
      const country = await getCountryById(countryId); // Fetch country by ID
      if (!country) {
          res.status(404).send('Country not found');
          return;
      }
      res.render('editCountry', {title:'edit', country });
  } catch (error) {
      console.error('Error fetching country:', error);
      res.status(500).send('Error fetching country');
  }
});

// Route to update a country
app.post('/countries/:id/edit', async (req, res) => {
  const countryId = req.params.id;
  const newName = req.body.newName;

  try {
      await updateCountry(countryId, newName); // Update country in the database
      res.redirect('/countries'); // Redirect to the countries page after updating
  } catch (error) {
      console.error('Error updating country:', error);
      res.status(500).send('Error updating country');
  }
});

// Function to update a country in the database
async function updateCountry(countryId, newName) {
  return new Promise((resolve, reject) => {
      const sql = 'UPDATE countries SET name = ? WHERE id = ?';
      connection.query(sql, [newName, countryId], (err, result) => {
          if (err) {
              reject(err); // Reject the promise if there's an error
              return;
          }
          resolve(); // Resolve the promise if update is successful
      });
  });
}

// Route to delete a country
app.post('/countries/:id/delete', async (req, res) => {
  const countryId = req.params.id;

  try {
      await deleteCountry(countryId); // Delete country from the database
  } catch (error) {
      console.error('Error deleting country:', error);
      res.status(500).send('Error deleting country');
  }
});

// Function to delete a country from the database
async function deleteCountry(countryId) {
  return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM countries WHERE id = ?';
      connection.query(sql, [countryId], (err, result) => {
          if (err) {
              reject(err); // Reject the promise if there's an error
              return;
          }
          resolve(); // Resolve the promise if deletion is successful
      });
  });
}


// Route to render the cities page
app.get('/citylist', async (req, res) => {
  try {
      const cities = await getCitiesFromDatabase(); // Fetch cities from the database
      res.render('cities', { title: 'List of Cities', cities }); // Render the cities.ejs template with the cities data
  } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).send('Error fetching cities');
  }
});


// Function to fetch cities from the database
async function getCitiesFromDatabase() {
  return new Promise((resolve, reject) => {
      const sql = 'SELECT id, name FROM cities';
      connection.query(sql, (err, results) => {
          if (err) {
              reject(err); // Reject the promise if there's an error
              return;
          }
          resolve(results); // Resolve with the cities data
      });
  });
}


// Route to render the update city form
app.get('/cities/:id/edit', async (req, res) => {
  const cityId = req.params.id;

  try {
      const city = await getCityById(cityId); // Fetch city by ID
      if (!city) {
          res.status(404).send('City not found');
          return;
      }
      res.render('editCity', {title:'edit', city });
  } catch (error) {
      console.error('Error fetching city:', error);
      res.status(500).send('Error fetching city');
  }
});

// Function to fetch a city by ID from the database
async function getCityById(cityId) {
  return new Promise((resolve, reject) => {
      const sql = 'SELECT id, name FROM cities WHERE id = ?';
      connection.query(sql, [cityId], (err, result) => {
          if (err) {
              reject(err); // Reject the promise if there's an error
              return;
          }
          if (result.length === 0) {
              resolve(null); // Resolve with null if city is not found
          } else {
              resolve(result[0]); // Resolve with the city data
          }
      });
  });
}

// Route to update a city
app.post('/cities/:id/edit', async (req, res) => {
  const cityId = req.params.id;
  const newName = req.body.newName; // Assuming you have a form field for the new city name

  try {
      await updateCity(cityId, newName); // Update city in the database
  } catch (error) {
      console.error('Error updating city:', error);
      res.status(500).send('Error updating city');
  }
  res.send('updated successfully')
});

// Function to update a city in the database
async function updateCity(cityId, newName) {
  return new Promise((resolve, reject) => {
      const sql = 'UPDATE cities SET name = ? WHERE id = ?';
      connection.query(sql, [newName, cityId], (err, result) => {
          if (err) {
              reject(err); // Reject the promise if there's an error
              return;
          }
          resolve(); // Resolve the promise if update is successful
      });
  });
}
// Function to delete a city from the database
async function deleteCity(cityId) {
  return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM cities WHERE id = ?';
      connection.query(sql, [cityId], (err, result) => {
          if (err) {
              reject(err); // Reject the promise if there's an error
              return;
          }
          resolve(result); // Resolve with the result of the deletion operation
      });
  });
}

// Route to delete a city
app.post('/cities/:id/delete', async (req, res) => {
  const cityId = req.params.id;

  try {
      const result = await deleteCity(cityId); // Attempt to delete city from the database
      if (result.affectedRows > 0) {
          res.redirect('/cities'); // Redirect to the cities page after successful deletion
      } else {
          res.status(404).send('City not found'); // City with the provided ID not found
      }
  } catch (error) {
      console.error('Error deleting city:', error);
      res.status(500).send('Error deleting city');
  }
  res.send('deleted successfully')
});



// Route to render the company profile form
app.get('/addCompany', async (req, res) => {
  try {
      const countries = await getCountries();
      const cities = await getCities();

      res.render('company_profile', { title: 'add', countries, cities });
  } catch (error) {
      console.error('Error:', error); // Log the error
      res.status(500).send('Internal Server Error');
  }
});


// Helper function to fetch countries from the database
async function getCountries() {
  return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM countries';
      connection.query(sql, (err, result) => {
          if (err) reject(err);
          resolve(result);
      });
  });
}

// Helper function to fetch cities from the database
async function getCities() {
  return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM cities';
      connection.query(sql, (err, result) => {
          if (err) reject(err);
          resolve(result);
      });
  });
}

// Route to display all company profiles
app.get('/company-profiles', async (req, res) => {
  try {
      const companyProfiles = await getAllCompanyProfiles();

      // Render the company profiles view with the company profiles data
      res.render('companies', {title:'company profile', companyProfiles });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Helper function to fetch all company profiles from the database
async function getAllCompanyProfiles() {
  return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM company_profile';
      connection.query(sql, (err, result) => {
          if (err) reject(err);
          resolve(result);
      });
  });
}
// Route to display company details by ID
app.get('/company-profile/:id', async (req, res) => {
  const companyId = req.params.id;
  try {
      const company = await getCompanyDetails(companyId);
      if (!company) {
          return res.status(404).send('Company not found');
      }
      res.render('company_detail', {title:'company', company });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Helper function to execute SQL queries with promises
function query(sql, args) {
  return new Promise((resolve, reject) => {
      connection.query(sql, args, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
      });
  });
}

async function getCompanyDetails(companyId) {
  try {
      // Query to fetch company details from your database table
      const sql = 'SELECT * FROM company_profile WHERE id = ?';
      const rows = await query(sql, [companyId]);
      
      // Check if company with given ID exists
      if (rows.length > 0) {
          return rows[0]; // Return the first (and only) row
      } else {
          return null; // Company not found
      }
  } catch (error) {
      console.error('Error fetching company details:', error);
      throw error; // Forward the error to the caller
  }
}

//loans
// Route to get all loan types
app.get('/loan-setup', (req, res) => {
  connection.query('SELECT * FROM loan_types', (err, results) => {
    if (err) throw err;
    res.render('loan-types', {title:'loans', loanTypes: results });
  });
});

// Route to add a new loan type
app.post('/loan-types/add', (req, res) => {
  const { type, maxAmount } = req.body;

  if (!type || !maxAmount || isNaN(maxAmount)) {
    return res.status(400).send('Invalid input data');
  }

  const newLoanType = {
    type: type,
    max_amount: maxAmount
  };

  connection.query('INSERT INTO loan_types SET ?', newLoanType, (err, result) => {
    if (err) throw err;
    res.redirect('/loan-types');
  });
});

// Route to update a loan type
app.post('/loan-types/update/:id', (req, res) => {
  const loanTypeId = req.params.id;
  const { type, maxAmount } = req.body;

  if (!type || !maxAmount || isNaN(maxAmount)) {
    return res.status(400).send('Invalid input data');
  }

  const updatedLoanType = {
    type: type,
    max_amount: maxAmount
  };

  connection.query('UPDATE loan_types SET ? WHERE id = ?', [updatedLoanType, loanTypeId], (err, result) => {
    if (err) throw err;
    res.redirect('/loan-types');
  });
});


// Route to delete a loan type
app.post('/loan-types/delete/:id', (req, res) => {
  const loanTypeId = req.params.id;

  connection.query('DELETE FROM loan_types WHERE id = ?', [loanTypeId], (err, result) => {
    if (err) throw err;
    res.redirect('/loan-types');
  });
});


// Route to render the assign loan form
app.get('/assign-loan', (req, res) => {
  connection.query('SELECT id, CONCAT(firstName, " ", IFNULL(middleName, ""), " ", lastName) AS fullName FROM employees', (error, employees) => {
    if (error) {
      throw error; // Handle the error appropriately, such as sending an error response
    }

    connection.query('SELECT * FROM loan_types', (err, loanTypes) => {
      if (err) {
        throw err; // Handle the error appropriately, such as sending an error response
      }

      res.render('assign-loan', { title: 'Assign Loan', employees: employees, loanTypes: loanTypes });
    });
  });
});




// Route to handle assigning a loan to an employee
app.post('/assign-loan', (req, res) => {
  const { employeeId, loanTypeId, amount, startDate, endDate } = req.body;

  // Convert the amount to a valid decimal number
  const parsedAmount = parseFloat(amount);
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (!employeeId || !loanTypeId || isNaN(parsedAmount)) {
    return res.status(400).send('Invalid input data');
  }

  if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    return res.status(400).send('Invalid date format');
  }

  connection.query('SELECT max_amount FROM loan_types WHERE id = ?', [loanTypeId], (err, results) => {
    if (err) throw err;

    const maxAmount = parseFloat(results[0].max_amount);

    if (parsedAmount > maxAmount) {
      return res.status(400).send('Loan amount exceeds maximum amount for the selected loan type');
    }

    const loanData = {
      employee_id: employeeId,
      loan_type_id: loanTypeId,
      amount: parsedAmount,
      start_date: parsedStartDate.toISOString().slice(0, 10), // Format as YYYY-MM-DD
      end_date: parsedEndDate.toISOString().slice(0, 10), // Format as YYYY-MM-DD
      date_requested: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    // Insert the loan details into the employee_loans table
    connection.query('INSERT INTO employee_loans SET ?', loanData, (err, result) => {
      if (err) throw err;

      // Call the stored procedure to calculate and update loan deductions
      connection.query('CALL calculateLoanDeductions(?, ?, ?, ?)', [employeeId, loanData.start_date, loanData.end_date, loanData.amount], (err, result) => {
        if (err) throw err;

        res.send('Loan assigned successfully');
      });
    });
  });
});




app.get('/employee-loans', (req, res) => {
  // Fetch employees with loans and loan types from the database
  const query = `
    SELECT 
      employees.id AS employeeId,
      CONCAT(employees.firstName, ' ', employees.lastName) AS fullName,
      employee_loans.id AS loanId,
      loan_types.type AS loanName,
      employee_loans.amount AS loanAmount,
      employee_loans.start_date AS loanStartDate,
      employee_loans.end_date AS loanEndDate,
      employee_loans.deduction_amount AS deductionAmount -- Fetch deduction amount
    FROM employees
    INNER JOIN employee_loans ON employees.id = employee_loans.employee_id
    INNER JOIN loan_types ON employee_loans.loan_type_id = loan_types.id
  `;

  connection.query(query, (err, results) => {
    if (err) {
      throw err; // Handle the error appropriately
    }

    // Group loan details by employee
    const employeesWithLoans = results.reduce((acc, row) => {
      const employeeId = row.employeeId;

      if (!acc[employeeId]) {
        acc[employeeId] = {
          employeeId: row.employeeId,
          fullName: row.fullName,
          loans: [],
        };
      }

      if (row.loanId) {
        acc[employeeId].loans.push({
          loanId: row.loanId,
          loanName: row.loanName,
          loanAmount: row.loanAmount,
          loanStartDate: row.loanStartDate,
          loanEndDate: row.loanEndDate,
          deductionAmount: row.deductionAmount, // Include deductionAmount
        });
      }

      return acc;
    }, {});

    const employeesList = Object.values(employeesWithLoans);

    // Render the employee-loans-list.ejs file and pass the employee list with loans
    res.render('employee-loans-list', { title: 'Loan List', employeesList: employeesList });
  });
});




app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

