const express = require("express");
const router = express.Router();
const { getAllAccountsInfo,getAccountById } = require('../controllers/adminController');

const verifyToken = require("../middlewares/verifyToken");

router.get("/accounts", getAllAccountsInfo);
router.get("/accounts/:id", getAccountById);
module.exports = router;