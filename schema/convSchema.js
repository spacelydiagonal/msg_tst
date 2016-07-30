var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var convSchema = mongoose.Schema({
    from: {
        type: String,                   /* 1- system,   2 - group,   3 - user */
        username: String,               /**/
        email: String,
        password: String
    },
    to : {
        type: String,                   /* 1- system,   2 - group,   3 - user */
        username: String,
        email: String,
        password: String
    },
    msg : {
        type: String,
        content: String

    }
});

module.exports = mongoose.model('conv', convSchema);