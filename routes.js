const express = require('express');
const router = express.Router();
const connection = require('./db');
const expressLayouts = require('express-ejs-layouts');
const multer = require('multer');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('layout', 'layouts/layout');


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: '../public',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
// Create a new company profile
router.post('/company-profile', upload.single('profile_picture'), (req, res) => {
    const { company_name, country_id, city_id, business_type, year_established, legal_structure, founders_owners, company_size, headquarters_location, branches_locations, contact_phone, contact_email, website, linkedin, facebook, twitter, annual_revenue } = req.body;

    // Get the file path of the uploaded profile picture
    const profilePicturePath = req.file ? req.file.path : '';

    const sql = 'INSERT INTO company_profile (company_name, country_id, city_id, business_type, year_established, legal_structure, founders_owners, company_size, headquarters_location, branches_locations, contact_phone, contact_email, website, linkedin, facebook, twitter, annual_revenue, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [company_name, country_id, city_id, business_type, year_established, legal_structure, founders_owners, company_size, headquarters_location, branches_locations, contact_phone, contact_email, website, linkedin, facebook, twitter, annual_revenue, profilePicturePath], (err, result) => {
        if (err) throw err;
        res.send('Company profile created');
    });
});



module.exports = router;
