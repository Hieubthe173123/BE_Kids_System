const express = require('express');
const router = express.Router();

const { getAllHolidays, getHolidayByDate } = require("../controllers/holidayController")
router.get('/', getAllHolidays);
router.get('/:date', getHolidayByDate);
module.exports = router;