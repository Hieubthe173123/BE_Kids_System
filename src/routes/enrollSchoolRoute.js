const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { createEnrollSchool, processEnrollSchoolAll } = require('../controllers/enrollSchoolController');



// router.get("/:id", verifyToken,  findIdGeneric(Parent, ["student"]));
router.post("/",createEnrollSchool);
router.put('/process-enroll', processEnrollSchoolAll);


module.exports = router;