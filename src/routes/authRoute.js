const express = require("express");
const router = express.Router();
const { loginAccount, logoutAccount, getInformationAccount, resetPassword, verifyOTP, forgotPassword, accessToken, getUser } = require('../controllers/authController');
const verifyToken = require("../middlewares/verifyToken");


router.post("/login", loginAccount);
router.post("/logout", verifyToken, logoutAccount);
router.get("/information", verifyToken, getInformationAccount);

router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPassword);
router.post("/access-token", accessToken);
router.get("/user", verifyToken, getUser);
module.exports = router;