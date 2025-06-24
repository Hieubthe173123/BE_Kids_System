const express = require("express");
const router = express.Router();
const { loginAccount, logoutAccount, getInformationAccount, resetPassword, verifyOTP, forgotPassword } = require('../controllers/authController');
const verifyToken = require("../middlewares/verifyToken");


router.post("/login", loginAccount);
router.post("/logout", verifyToken, logoutAccount);
router.get("/infomation", verifyToken, getInformationAccount);

router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPassword);

module.exports = router;