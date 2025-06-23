const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { createEnrollSchool } = require('../controllers/enrollSchoolController');



// router.get("/:id", verifyToken,  findIdGeneric(Parent, ["student"]));
router.post("/",createEnrollSchool);

module.exports = router;