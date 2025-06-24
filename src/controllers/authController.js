const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, TOKEN } = require('../constants/useConstants');
const { redisClient } = require("../configs/redisConfig");
const Account = require('../models/accountModel');
const Parent = require('../models/parentModel');
const { sendOTPEmail } = require("../utils/emailsOTP");
const { findAccountByEmail } = require("../helper");


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
            { id: account._id, role: account.role },
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

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Please enter email !!" });

        const result = await findAccountByEmail(email);
        if (!result) return res.status(404).json({ message: "Email does not exist" });

        const { account } = result;

        const OTPnumber = Math.floor(100000 + Math.random() * 900000);
        const hashedOtp = await bcrypt.hash(OTPnumber.toString(), 10);
        const exprire_in = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

        await Account.updateOne({ _id: account._id }, { OTPnumber: hashedOtp, exprire_in });

        await sendOTPEmail(email, OTPnumber);

        return res.json({ message: "OTP has been sent to your email" });
    } catch (error) {
        return res.status(500).json({ message: "Error while sending OTP", error: error.message });
    }
};


exports.verifyOTP = async (req, res, next) => {
    try {
        const { OTPnumber } = req.body;
        if (!OTPnumber) return res.status(400).json({ message: "Please enter OTP" });
        const users = await Account.find({ OTPnumber: { $ne: null } });
        if (!users || users.length === 0) {
            return res.status(400).json({ message: "OTP is incorrect or expired" });
        }
        let matchedUser = null;
        for (const user of users) {
            if (user.exprire_in && new Date() < user.exprire_in) {
                const isMatch = await bcrypt.compare(otp.toString(), user.otp);
                if (isMatch) {
                    matchedUser = user;
                    break;
                }
            }
        }
        if (!matchedUser) {
            return res.status(400).json({ message: "OTP is incorrect or expired" });
        }
        await Account.updateOne(
            { _id: matchedUser._id },
            { OTPnumber: null, exprire_in: null }
        );
        return res.json({ message: "Valid OTP, please enter new password" });
    } catch (error) {
        return res
            .status(500)
            .json({ message: "Error while verifying OTP", error: error.message });
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        if (!email) return res.status(400).json({ message: "Email is required!" });
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({ message: "Please enter complete information" });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Confirmed password does not match" });
        }

        const result = await findAccountByEmail(email);
        if (!result) return res.status(404).json({ message: "Account not found" });

        const { account } = result;
        account.password = await bcrypt.hash(newPassword, 10);
        await account.save();

        return res.json({ message: "Password changed successfully!" });
    } catch (error) {
        return res.status(500).json({ message: "Error changing password", error: error.message });
    }
};

