const express = require("express");
const router = express.Router();
const { getAllAccountsInfo,getAccountById,saveAccountInfo } = require('../controllers/adminController');

const verifyToken = require("../middlewares/verifyToken");

router.get("/accounts", getAllAccountsInfo);
router.get("/accounts/:id", getAccountById);
router.put('/accounts/:id', saveAccountInfo);
module.exports = router;