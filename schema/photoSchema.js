var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var photoSchema = mongoose.Schema({
    owner: {
        type: String,                   /* 1- system,   2 - group,   3 - user */
        username: String,               /**/
        email: String,
        password: String
    },
    content: {

    },
    sharedTo: {

    }
});

module.exports = mongoose.model('photo_model', photoSchema);