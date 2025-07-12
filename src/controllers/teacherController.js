const { HTTP_STATUS } = require('../constants/useConstants');

exports.getTimeTable = async (req, res) => {
    try {
     
        res.json("timeTable");
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi server' });
    }
}


exports.getClasses = async (req, res) => {
    try {
        res.json("classes");
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi server' });
    }
}

exports.getStudents = async (req, res) => { 
    try {
        res.json("students");
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi server' });
    }
}

