const express = require("express");
const router = express.Router();
const { loginAccount, logoutAccount, getInformationAccount } = require('../controllers/authController');
const verifyToken = require("../middlewares/verifyToken");


router.post("/login",loginAccount);
router.post("/logout", verifyToken, logoutAccount);
router.get("/infomation",verifyToken, getInformationAccount);

module.exports = router;