var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var boardSchema = mongoose.Schema({
    id: String,
    title: String,
    creator: String,
    description: String,
    category: String,
    data_contents: [],
    pubflag: String,
    collaborators: []
});

module.exports = mongoose.model('board', boardSchema);