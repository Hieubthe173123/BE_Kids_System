const jwt = require("jsonwebtoken");
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "wdp_301";
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, TOKEN } = require('../constants/useConstants');

const verifyToken = (req, res, next) => {
  // const authHeader = req.headers.authorization;

  // if (!authHeader || !authHeader.startsWith("Bearer ")) {
  //   return res.status(HTTP_STATUS.UNAUTHORIZED).json(RESPONSE_MESSAGE.UNAUTHORIZED);
  // }

  // const token = authHeader.split(" ")[1];
  const token = req.cookies.accessToken;

  if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
 
    
    req.account = decoded; 
    next();
  } catch (err) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(RESPONSE_MESSAGE.FORBIDDEN);
  }
};

module.exports = verifyToken;
