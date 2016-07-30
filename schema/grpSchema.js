var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var grpSchema = mongoose.Schema({
    grpID : String,
    grpUsers : []
});

module.exports = mongoose.model('cnvGrps', grpSchema);