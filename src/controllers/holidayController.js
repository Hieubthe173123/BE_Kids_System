const Holiday = require('../models/holidayModel');

exports.getAllHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ date: 1 });
        res.status(200).json(holidays);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// exports.getHolidayByDate = async (req, res) => {
//     try {
//         const { date } = req.params;
//         const start = new Date(date);
//         start.setHours(0, 0, 0, 0);
//         const end = new Date(date);
//         end.setHours(23, 59, 59, 999);

//         const holiday = await Holiday.findOne({
//             date: { $gte: start, $lte: end }
//         });

//         if (!holiday) {
//             return res.status(404).json({ message: 'Không tìm thấy ngày lễ.' });
//         }
//         res.status(200).json(holiday);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

exports.getHolidayByDate = async (req, res) => {
    try {
        const { date } = req.params;
        const holiday = await Holiday.findOne({ date: date });

        if (!holiday) {
            return res.status(404).json({ message: 'Không tìm thấy ngày lễ.' });
        }
        res.status(200).json(holiday);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
