const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    UPDATED: 203,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
};

const RESPONSE_MESSAGE = {
    SUCCESS: 'Thành công',
    CREATED: 'Tạo mới thành công',
    UPDATED: 'Cập nhật thành công',
    DELETED: 'Xóa thành công',
    NOT_FOUND: 'Không tìm thấy dữ liệu',
    FORBIDDEN: 'Không đủ quyền truy cập',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
    UNAUTHORIZED: 'Không tìm thấy tài khoản',
    MISSING_FIELDS: 'Vui lòng nhập đầy đủ các trường bắt buộc',
    UNIQUE_FIELDS: 'Dữ liệu bị trùng'
};

const USER_ROLES = {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    PARENT: 'parent',
    PRINCIPAL: 'principal',
};

const VALIDATION_CONSTANTS = {
    MAX_STUDENT_AGE: 5,
    MIN_STUDENT_AGE: 1,
    PHONE_REGEX: /^0[0-9]{9}$/, 
    ID_CARD_REGEX: /^[0-9]{9,12}$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
}

const TOKEN = {
    EXPIRESIN_TOKEN: '1d',
    EXPIRESIN_REFESH_TOKEN: '1d',
    EX: 7 * 24 * 60 * 60 
}


module.exports = {
  HTTP_STATUS,
  RESPONSE_MESSAGE,
  USER_ROLES,
  VALIDATION_CONSTANTS,
  TOKEN
};