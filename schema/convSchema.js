var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var convSchema = mongoose.Schema({
    conv_id: String,                    /* id of this conversation, same as contact id if type is one or con, group id if type is grp */
    type: String,                       /* 1- CON,   2 - ONE, 3 - GRP */
    timestamp: String,                  /* Time stamp of this conversation.. */
    from: String,                       /* Email of sender.. */
    msg_type: String,                   /* 1- TEXT,                                     2 - IMG,                                        3 - FILE                    */
    msg_subtype: String,                /* TEXT - "",                                   IMG - "" OR JPGE, PNG, ...,                     FILE - PDF, WORD, EXCEL, .. */
    msg_content: String                 /* TEXT - message of text,                      IMG - Content of image                          FILE - Path of file..       */
});

module.exports = mongoose.model('conv', convSchema);