const { app } = require('@azure/functions');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, TOKEN } = require('../src/constants/useConstants');
const Account = require('../src/models/accountModel');
const Parent = require('../src/models/parentModel');
const Principal = require('../src/models/principalModel');
const { sendOTPEmail } = require("../src/utils/emailsOTP");
const { findAccountByEmail } = require("../src/helper");
const connectDB = require("../shared/mongoose");
const { redisClient, connectRedis } = require('../shared/redisClient');
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "wdp_301";


app.http('loginAccount', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/login',
    handler: async (request, context) => {
        try {
            await connectDB();
            const body = await request.json();
            const { username, password } = body;

            if (!username || !password) {
                return {
                    status: HTTP_STATUS.BAD_REQUEST,
                    jsonBody: RESPONSE_MESSAGE.MISSING_FIELDS,
                };
            }
            const queryAccount = { username, status: true };
            const account = await Account.findOne(queryAccount);

            if (!account) {
                return {
                    status: HTTP_STATUS.NOT_FOUND,
                    jsonBody: RESPONSE_MESSAGE.NOT_FOUND,
                };
            }
            const checkPassword = await bcrypt.compare(password, account.password);
            if (!checkPassword) {
                return {
                    status: 401,
                    jsonBody: { message: "Mật khẩu không đúng vui lòng thử lại!" },
                };
            }
            const accessToken = jwt.sign(
                { id: account._id, role: account.role },
                ACCESS_SECRET,
                { expiresIn: TOKEN.EXPIRESIN_TOKEN }
            );
            const refreshToken = jwt.sign(
                { id: account._id },
                ACCESS_SECRET,
                { expiresIn: TOKEN.EXPIRESIN_REFESH_TOKEN }
            );
            if (!redisClient.isOpen) {
                await connectRedis();
            }
            await redisClient.set(account._id.toString(), refreshToken, { EX: TOKEN.EX });
            return {
                status: HTTP_STATUS.OK,
                cookies: [
                    {
                        name: "accessToken",
                        value: accessToken,
                        httpOnly: true,
                        secure: true,
                        sameSite: "strict",
                        maxAge: 1000 * 60 * 1,
                    },
                    {
                        name: "refreshToken",
                        value: refreshToken,
                        httpOnly: true,
                        secure: true,
                        sameSite: "strict",
                        maxAge: 1000 * 60 * 5,
                    },
                ],
                jsonBody: {
                    message: "Đăng nhập thành công",
                    accessToken,
                },
            };

        } catch (err) {
            context.log("Login error:", err);
            return {
                status: HTTP_STATUS.SERVER_ERROR,
                jsonBody: {
                    message: "Server error",
                    error: err.message,
                },
            };
        }
    },
});

// Đăng xuất
// app.http('logoutAccount', {
//     methods: ['POST'],
//     authLevel: 'anonymous',
//     route: 'auth/logout',
//     handler: async (request, context) => {
//         try {
//             await connectDB();
//             const body = await request.json();
//             const accountId = body.accountId;
//             await redisClient.del(accountId.toString());
//             return { status: HTTP_STATUS.OK, jsonBody: { message: "Logout successful" } };
//         } catch (err) {
//             context.log("Logout error:", err.message);
//             return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Server error" } };
//         }
//     }
// });

app.http('logoutAccount', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/logout',
    handler: async (request, context) => {
        try {
            await connectDB();
            let body;
            try {
                body = await request.json();
            } catch (jsonErr) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: { message: "Invalid JSON body" } };
            }
            if (!body || !body.accountId) {
                return { status: HTTP_STATUS.BAD_REQUEST, jsonBody: { message: "Missing accountId" } };
            }
            const accountId = body.accountId;
            await redisClient.del(accountId.toString());
            return { status: HTTP_STATUS.OK, jsonBody: { message: "Logout successful" } };
        } catch (err) {
            context.log("Logout error:", err.message);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Server error" } };
        }
    }
});

app.http('getInformationAccount', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth/information',
    handler: async (request, context) => {
        try {
            await connectDB();
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    status: HTTP_STATUS.UNAUTHORIZED,
                    jsonBody: { message: "Thiếu hoặc sai định dạng accessToken" },
                };
            }
            const token = authHeader.replace('Bearer ', '').trim();

            let payload;
            try {
                payload = jwt.verify(token, ACCESS_SECRET);
            } catch (err) {
                return {
                    status: HTTP_STATUS.UNAUTHORIZED,
                    jsonBody: { message: "Token không hợp lệ hoặc đã hết hạn" },
                };
            }

            const accountId = payload.id;
            if (!accountId) {
                return {
                    status: HTTP_STATUS.BAD_REQUEST,
                    jsonBody: { message: "Không tìm thấy accountId trong token" },
                };
            }

            const account = await Account.findById(accountId);
            if (!account) {
                return {
                    status: HTTP_STATUS.NOT_FOUND,
                    jsonBody: { message: "Account not found" },
                };
            }

            const role = account.role;
            let information = {};

            if (role === USER_ROLES.PARENT) {
                information = await Parent.findOne({ account: accountId }).populate("account", "role");
            } else if (role === USER_ROLES.TEACHER) {
                try {
                    const Teacher = require('../src/models/teacherModel');
                    information = await Teacher.findOne({ account: accountId }).populate("account", "role");
                } catch (e) {
                    information = {};
                }
            } else {
                information = await Principal.findOne({ account: accountId }).populate("account", "role");
            }

            return {
                status: HTTP_STATUS.OK,
                jsonBody: information,
            };

        } catch (err) {
            context.log("getInformationAccount error:", err);
            return {
                status: HTTP_STATUS.SERVER_ERROR,
                jsonBody: { message: "Server error", error: err.message },
            };
        }
    }
});

// Quên mật khẩu
app.http('forgotPassword', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/forgot-password',
    handler: async (request, context) => {
        try {
            await connectDB();
            const body = await request.json();
            const { email } = body;
            if (!email) return { status: 400, jsonBody: { message: "Please enter email !!" } };
            const result = await findAccountByEmail(email);
            if (!result) return { status: 404, jsonBody: { message: "Email does not exist" } };
            const { account } = result;
            const OTPnumber = Math.floor(100000 + Math.random() * 900000);
            const hashedOtp = await bcrypt.hash(OTPnumber.toString(), 10);
            const exprire_in = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
            await Account.updateOne({ _id: account._id }, { OTPnumber: hashedOtp, exprire_in });
            await sendOTPEmail(email, OTPnumber);
            return { jsonBody: { message: "OTP has been sent to your email" } };
        } catch (error) {
            return { status: 500, jsonBody: { message: "Error while sending OTP", error: error.message } };
        }
    }
});

// Xác thực OTP
app.http('verifyOTP', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/verify-otp',
    handler: async (request, context) => {
        try {
            await connectDB();
            const body = await request.json();
            const { OTPnumber } = body;
            if (!OTPnumber) return { status: 400, jsonBody: { message: "Please enter OTP" } };
            const users = await Account.find({ OTPnumber: { $ne: null } });
            if (!users || users.length === 0) {
                return { status: 400, jsonBody: { message: "OTP is incorrect or expired" } };
            }
            let matchedUser = null;
            for (const user of users) {
                if (user.exprire_in && new Date() < user.exprire_in) {
                    const isMatch = await bcrypt.compare(OTPnumber.toString(), user.OTPnumber);
                    if (isMatch) {
                        matchedUser = user;
                        break;
                    }
                }
            }
            if (!matchedUser) {
                return { status: 400, jsonBody: { message: "OTP is incorrect or expired" } };
            }
            await Account.updateOne(
                { _id: matchedUser._id },
                { OTPnumber: null, exprire_in: null }
            );
            return { jsonBody: { message: "Valid OTP, please enter new password" } };
        } catch (error) {
            return { status: 500, jsonBody: { message: "Error while verifying OTP", error: error.message } };
        }
    }
});

// Đặt lại mật khẩu
app.http('resetPassword', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/reset-password',
    handler: async (request, context) => {
        try {
            await connectDB();
            const body = await request.json();
            const { email, newPassword, confirmPassword } = body;
            if (!email) return { status: 400, jsonBody: { message: "Email is required!" } };
            if (!newPassword || !confirmPassword) {
                return { status: 400, jsonBody: { message: "Please enter complete information" } };
            }
            if (newPassword !== confirmPassword) {
                return { status: 400, jsonBody: { message: "Confirmed password does not match" } };
            }
            const result = await findAccountByEmail(email);
            if (!result) return { status: 404, jsonBody: { message: "Account not found" } };
            const { account } = result;
            account.password = newPassword;
            await account.save();
            return { jsonBody: { message: "Password changed successfully!" } };
        } catch (error) {
            return { status: 500, jsonBody: { message: "Error changing password", error: error.message } };
        }
    }
});

// Làm mới accessToken từ refreshToken trong cookie
app.http('refreshAccessToken', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/access-token',
    handler: async (request, context) => {
        try {
            await connectDB();

            // **SỬA LỖI:** Đọc và parse cookie từ header
            const cookieHeader = request.headers.get('cookie');
            if (!cookieHeader) {
                return { status: HTTP_STATUS.UNAUTHORIZED, jsonBody: { message: "Không tìm thấy cookie" } };
            }
            const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=')));
            const refreshToken = cookies.refreshToken;

            if (!refreshToken) {
                return { status: HTTP_STATUS.UNAUTHORIZED, jsonBody: { message: "Refresh token không tồn tại trong cookie" } };
            }

            const payload = jwt.verify(refreshToken, ACCESS_SECRET);

            if (!payload || !payload.id) {
                return { status: HTTP_STATUS.UNAUTHORIZED, jsonBody: { message: "Refresh token không hợp lệ (invalid payload)" } };
            }

            if (!redisClient.isOpen) {
                await connectRedis();
            }
            const redisToken = await redisClient.get(payload.id.toString());
            if (!redisToken || redisToken !== refreshToken) {
                return { status: HTTP_STATUS.UNAUTHORIZED, jsonBody: { message: "Refresh token không hợp lệ hoặc đã bị thu hồi" } };
            }

            const account = await Account.findById(payload.id);
            if (!account) {
                return { status: HTTP_STATUS.NOT_FOUND, jsonBody: { message: "Tài khoản không tồn tại" } };
            }

            const newAccessToken = jwt.sign({ id: account._id, role: account.role }, ACCESS_SECRET, { expiresIn: TOKEN.EXPIRESIN_TOKEN });

            return {
                status: HTTP_STATUS.OK,
                jsonBody: { accessToken: newAccessToken }
            };
        } catch (err) {
            context.log("accessToken error:", err);
            if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
                return { status: HTTP_STATUS.UNAUTHORIZED, jsonBody: { message: "Refresh token không hợp lệ hoặc đã hết hạn" } };
            }
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Server error on refresh", error: err.message, stack: err.stack } };
        }
    }
});

// Lấy user test
app.http('getUser', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth/user',
    handler: async (request, context) => {
        try {
            await connectDB();
            return { status: HTTP_STATUS.OK, jsonBody: { message: "User found" } };
        } catch (err) {
            context.log("getUser error:", err);
            return { status: HTTP_STATUS.SERVER_ERROR, jsonBody: { message: "Server error" } };
        }
    }
});
