const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, TOKEN } = require('../constants/useConstants');
const { redisClient } = require("../configs/redisConfig");
const Account = require('../models/accountModel');
const Parent = require('../models/parentModel');


const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "wdp_301";

exports.loginAccount = async (req, res) => {
    try {
        console.log("🚀 ~ exports.loginAccount= ~ req.body", req.body)
        const { username, password } = req.body;
        console.log("🚀 ~ exports.loginAccount= ~ username, password:", username, password)

        if (!username || !password) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(RESPONSE_MESSAGE.MISSING_FIELDS);
        }

        const queryAccount = {
            username,
            status: true,
        }
        const account = await Account.findOne(queryAccount);
        if (!account) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(RESPONSE_MESSAGE.NOT_FOUND);
        }
        console.log("🚀 ~ exports.loginAccount= ~ user:", account)

        const checkPassword = await bcrypt.compare(password, account.password);
        if (!checkPassword) {
            return res.status(401).json({ message: "Mật khẩu không đúng vui lòng thử lại!" });
        }
        const accessToken = jwt.sign(
            { id: account._id },
            ACCESS_SECRET,
            { expiresIn: TOKEN.EXPIRESIN_TOKEN }
        );

        const refreshToken = jwt.sign({ id: account._id }, ACCESS_SECRET, { expiresIn: TOKEN.EXPIRESIN_REFESH_TOKEN });

        await redisClient.set(account._id.toString(), refreshToken, {
            EX: TOKEN.EX
        });

        res.status(HTTP_STATUS.OK).json({
            message: "Đăng nhập thành công",
            accessToken,
            refreshToken
        });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Server error" });
    }
};



exports.logoutAccount = async (req, res) => {
    try {
        const accountId = req.account.id;

        await redisClient.del(accountId.toString());

        return res.status(HTTP_STATUS.OK).json({ message: "Logout successful" });
    } catch (err) {
        console.error("Logout error:", err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Server error" });
    }
};

exports.getInformationAccount = async (req, res) => {
    try {
        const accountId = req.account.id;
        console.log("accountId", accountId);

        const account = await Account.findById(accountId);
        if (!account) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Account not found" });
        }

        const role = account.role;
        let information = {};

        if (role === USER_ROLES.PARENT) {
            information = await Parent.findOne({ account: accountId });
            console.log("🚀 ~ informationParent:", information)

        } else if (role === USER_ROLES.TEACHER) {
            //  information = await Teacher.findOne({ account: accountId });
        } else if (role === USER_ROLES.PRINCIPAL) {
            //  information = await Principal.findOne({ account: accountId });
        } else {
            information = {
                admin: "admin123",
            }
        }

        return res.status(HTTP_STATUS.OK).json(information);

    } catch (err) {
        console.error("getInformationAccount error:", err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Server error" });
    }
}
