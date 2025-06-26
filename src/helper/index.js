// const Parent = require("../models/Parent");
const Teacher = require("../models/teacherModel");
// const Principal = require("../models/Principal");
// const Admin = require("../models/Admin");

const parentModel = require("../models/parentModel");

async function findAccountByEmail(email) {
    const models = [
        { model: parentModel, role: "parent" },
        { model: Teacher, role: "teacher" },
        // { model: Principal, role: "principal" },
        // { model: Admin, role: "admin" },
    ];

    for (const { model } of models) {
        const user = await model.findOne({ email }).populate("account");
        if (user && user.account) {
            return { account: user.account, email };
        }
    }

    return null;
}

exports.findAccountByEmail = findAccountByEmail;