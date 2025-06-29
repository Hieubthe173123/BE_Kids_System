const express = require('express');
const router = express.Router();
const {
    getAllClasses,
    getClassById,
    createClass,
    updateClass,
    softDeleteClass,
    getClassBySchoolYear,
    getStudentsInClass,
    getTeachersInClass,
    addStudentsToClass,
    addTeachersToClass,
    removeStudentFromClass,
    removeTeacherFromClass,
    getClassByStatus,
    getAllSchoolYears,
    getAvailableStudents,
    getAvailableTeachers,
    getAllClassBySchoolYear
} = require('../controllers/classController');

// ===== STATIC ROUTES FIRST =====
router.get('/school-year', getAllSchoolYears);
router.get('/school-year/:year', getClassBySchoolYear);
router.get('/school-year/:year/all', getAllClassBySchoolYear);
router.get('/available-students', getAvailableStudents);
router.get('/available-teachers', getAvailableTeachers);
router.get('/status/:status', getClassByStatus);

// ===== CRUD ROUTES =====
router.get('/', getAllClasses);
router.get('/:id', getClassById);
router.post('/create', createClass);
router.put('/update/:id', updateClass);
router.delete('/delete/:id', softDeleteClass);

// ===== STUDENTS / TEACHERS IN CLASS =====
router.get('/:id/students', getStudentsInClass);
router.get('/:id/teachers', getTeachersInClass);
router.post('/:id/students', addStudentsToClass);
router.post('/:id/teachers', addTeachersToClass);
router.delete('/:classId/students/:studentId', removeStudentFromClass);
router.delete('/:classId/teachers/:teacherId', removeTeacherFromClass);

module.exports = router;
