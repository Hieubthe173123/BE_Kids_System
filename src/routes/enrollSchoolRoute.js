const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { createEnrollSchool, processEnrollSchoolAll, processEnrollError } = require('../controllers/enrollSchoolController');
const { findAllGeneric, findIdGeneric } = require('../controllers/useController');
const EnrollSChool = require('../models/enrollSchoolModel');


router.get("/", verifyToken, findAllGeneric(EnrollSChool));
router.post("/", createEnrollSchool);
router.post('/process-enroll', verifyToken, processEnrollSchoolAll);


module.exports = router;