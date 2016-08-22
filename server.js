var mongoose = require('mongoose');
var express = require('express');
var bodyparser = require('body-parser');
var passport = require('passport');
var flash = require('connect-flash');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
require('./config/passport')(passport);

var favicon = require('static-favicon');
var logger = require('morgan');

var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var formidable = require('formidable');

app.use(express.static(__dirname + '/public'));
app.use(flash());
app.use(cookieParser('proquerio'));
app.use(session({
    secret: 'secret',
    key: 'express.sid',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(favicon());
app.use(logger('dev'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));

//app.use(express.logger({stream:accessLogfile}));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));






////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Variables for chat bot..
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var datas=[], firstChoice;
var doorSchema = require('./schema/doorSchema.js').doorSchema;
var windowSchema = require('./schema/windowSchema.js').windowSchema;

var doorsData = mongoose.model("door", doorSchema);
var windowsData = mongoose.model("window", windowSchema);

var concierge = "proquerio@gmail.com";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Variables for upload images to boards..
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var user_board_data = [];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////










////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Start code..
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Initialize..
var CONN_STRING = "mongodb://localhost:27017/proquerio";
// var CONN_STRING = "mongodb://dev:dev@ds049854.mlab.com:49854/proquerio";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Connect db..
mongoose.connect(CONN_STRING);
var db = mongoose.connection;
db.on('error', function (err) {
    console.log('DB connection failed, stopped Server!', err);
});
db.once('open', function () {
    console.log('DB connected, ready to start!');
});

var UserDB = require('./schema/userSchema.js');
var GrpDB = require('./schema/grpSchema.js');
var BoardDB = require('./schema/boardSchema.js');
var ConvDB = require('./schema/convSchema.js');
var sUser;

String.prototype.contains = function(it) { return this.indexOf(it) != -1; };


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// For logged determine..
function loggedIn(req) {
    return typeof req.user == "undefined";
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Go to root..
app.get("/", function(req, res) {
    res.render('login.jade', {
        message: req.flash('loginMessage')
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Go to main..
app.get('/main', function(req, res) {
    if(loggedIn(req)) {
        res.redirect("/");
    }
    else {
        res.render("main.jade", {
            userInfo: req.user.local
        });
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Load signup..
app.get("/signup", function(req, res) {
    res.render('signup.jade', {
        message: req.flash('signupMessage')
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Success in signup, save user data, go to main page..
app.get("/signupSuccess", function(req, res) {
    if(!sUser) {
        // Render main chat view..
        res.redirect("/");
    }
    else {
        UserDB.findOne({"local.email" : sUser.local.email}, function (err, oneUser) {
            if ( err ) {
                console.log("Error on signup : " + err);
                res.render('/signup', {
                    message: "Error during signup! Try again!"
                });
            }

            if(!oneUser) {
                var newUser = new UserDB();
                newUser.local.email = sUser.local.email;
                newUser.local.password = newUser.generateHash(sUser.local.password);
                newUser.local.username = sUser.local.username;
                newUser.local.contacts = [];
                newUser.local.grp_contacts = [];
                newUser.local.img = "/images/man.png";

                // Create contact between concierge..
                var contactConcierge = {
                    state: "CONTACTED",
                    contact_id: "Concierge_" + sUser.local.email,
                    msg_budge: 0,
                    username : "Concierge",
                    email: concierge,
                    img: '/images/concierge.png',
                };
                newUser.local.contacts.push(contactConcierge);

                newUser.save(function (err) {
                    if (err) {
                        throw err;
                        return;
                    }

                    var userData = {
                        username: sUser.local.username,
                        email: sUser.local.email
                    }
                    // Render main chat view..
                    res.render('main.jade', {
                        userInfo: userData
                    });
                });
            }
            else {
                var userData = {
                    username: oneUser.local.username,
                    email: oneUser.local.email
                }
                // Render main chat view..
                res.render('main.jade', {
                    userInfo: userData
                });
            }
        });
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Login page..
app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/main',
    failureRedirect : '/',
    failureFlash : true,
    successFlash: true
}));

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Signup page..
app.post('/signup', function(req, res, next) {
        if(req.body.password == "") {
            res.render('signup.jade', {
                message: "Password must be at least 1 character!"
            });
        }
        else if(req.body.password == req.body.passwordD) {
            req.email = req.body.email;
            req.password = req.body.password;
            req.username = req.body.regname;
            sUser = new UserDB();
            sUser.local.email = req.body.email;
            sUser.local.password = req.body.password;
            sUser.local.username = req.body.regname;
            next();
        }
        else {
            res.render('signup.jade', {
                message: "Password confirm error!"
            });
        }
    },
    passport.authenticate('local-signup', {
        successRedirect: '/signupSuccess',
        failureRedirect: '/signup',
        failureFlash: true,
        successFlash: true
    })
);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Upload a file..
app.post('/upload-board', function(req, res){
    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;
    form.uploadDir = path.join(__dirname, '/uploads/board_data/');

    // every time a file has been uploaded successfully,
    // rename it to it's orignal name
    form.on('file', function(field, file) {
        // Rename file to the original..
        var timeStamp = new Date().getTime();
        var nameString = file.name;
        var split = nameString.lastIndexOf("_!_");
        var name = nameString.substring(0, split);
        var email = nameString.substring(split + 3);
        var filename = "board" + timeStamp + "_" + name;
        fs.rename(file.path, path.join(form.uploadDir, filename));

        // Set to the database..
        var uploadUser = email;
        var board_data = user_board_data.find(function(oneData) {
            return oneData.email === uploadUser;
        });
        var imgData = {};
        if(board_data) {
            imgData = {
                url: filename,
                filename: file.name,
                description: ""
            };
            board_data.boardImg.push(imgData);
        }
        else {
            var newData = {
                email: uploadUser,
                boardImg: []
            };

            imgData = {
                url: filename,
                filename: file.name,
                description: ""
            };
            newData.boardImg.push(imgData);
            user_board_data.push(newData);
        }
    });

    // log any errors that occur
    form.on('error', function(err) {
        console.log('An error has occured: \n' + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {
        res.end('success');
    });

    // parse the incoming request containing the form data
    // form.parse(req.body.formData);
    form.parse(req);

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Upload a file..
app.post('/upload', function(req, res){

    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;

    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname, '/uploads');

    // every time a file has been uploaded successfully,
    // rename it to it's orignal name
    form.on('file', function(field, file) {
        fs.rename(file.path, path.join(form.uploadDir, file.name));
    });

    // log any errors that occur
    form.on('error', function(err) {
        console.log('An error has occured: \n' + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {
        res.end('success');
    });

    // parse the incoming request containing the form data
    form.parse(req);

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Upload a file..
app.get('/download', function(req, res){
    var filePath = __dirname + '/uploads' + req.query.file;
    var fileName = req.query.file.substring(req.query.file.indexOf("_", 10) + 1);
    // var filePath = __dirname + "/public/images/man.png";
    res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
    res.setHeader('Content-Type', 'application/force-download');
    var filestream = fs.createReadStream(filePath);
    filestream.pipe(res);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Socket IO
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// User list of connected to this server..
var connectedUserList = [];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Connection established..
io.on('connection', function(socket) { //on first connection

    console.log('A user connected!');

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Receive new user, add user list, and let others know, from client.js : socket.emit("login");
    socket.on('login', function(user){
        /*
        user = {
            username : user name,
            email : user email,
            img : image
        }
        */

        user.id = socket.id;
        connectedUserList.push(user);

        // Get user information from database..
        UserDB.findOne({ 'local.email' :  user.email }, function(err, gotUser) {
            if (err) {
                console.log("Login -> Error on get user info from db : " + err);
                return;
            }

            if (!gotUser) {
                console.log("Login -> Can't read user info from db : " + gotUser);
                return;
            }

            var userInfo = {
                id : user.id,
                username : gotUser.local.username,
                email : gotUser.local.email,
                password : gotUser.local.password,
                contacts : gotUser.local.contacts,
                grp_contacts : gotUser.local.grp_contacts,
                img : user.img
            };

            console.log("LOGIN USER ----------");
            console.log(userInfo);

            // Send the client information to client..
            socket.emit('userInfo', userInfo);

            // Send the connected user list to all client : connectedUserList..
            io.emit('connectedList', connectedUserList);

            // Send board information..
            sendBoardResult(userInfo.email);               // For first connection..
        });

        // Send all users the feature of new user login..
        socket.broadcast.emit('sysInfo', user.username + " connected.");
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // When log out, delete user from user list and send new user list to the clients..
    socket.on('disconnect',function() {
        console.log("A user disconnected!");
        if (connectedUserList == null) {
            return;
        }

        var user = connectedUserList.find(function(oneUser) {
            return oneUser.id === socket.id;
        });

        if(user){
            // Remove user from list..
            connectedUserList.splice(connectedUserList.indexOf(user), 1);

            // Send the connected user list to all client : connectedUserList..
            io.emit('connectedList', connectedUserList);

            //send login info to all.
            socket.broadcast.emit('sysInfo', user.username + " disconnected.");
        }
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Receive new user, add user list, and let others know, from client.js : socket.emit("login");
    socket.on('refreshInfo', function(user){
        /*
         user = {
             id : user.id,
             username : "",
             email : "",
             password : "",
             contacts : [], same as userFounded..
             img : ""
         }
         */

        // Get user information from database..
        UserDB.findOne({ 'local.email' :  user.email }, function(err, gotUser) {
            if (err) {
                console.log("RefreshInfo -> Error on get user info from db : " + err);
                return;
            }

            if (!gotUser) {
                console.log("RefreshInfo -> Can't read user info from db : " + gotUser);
                return;
            }

            var userInfo = {
                id : user.id,
                username : gotUser.local.username,
                email : gotUser.local.email,
                password : gotUser.local.password,
                contacts : gotUser.local.contacts,
                img : user.img
            };

            // Send the client information to client..
            socket.emit('userInfo', userInfo);
        });
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send conversation data to the messenger..
    socket.on('loadConv', function(msgObj){
        /*
         msgObj = {
             type: "ONE"/ "GRP",
             from: userSelf.email,
             contact_id: contactUser.contact_id
             obj_email: user email / grpSelected.grpUsers,
         }
         */

        if(msgObj.type == "ONE") {
            resetUserMsgBudge(msgObj.from, msgObj.contact_id, false);
        }
        else if(msgObj.type == "GRP") {
            resetUserMsgBudge(msgObj.from, msgObj.contact_id, true);
        }

        // Get user information from database..
        ConvDB.find({ conv_id :  msgObj.contact_id }, function(err, convList) {
            var dataObj;
            if (err) {
                console.log("LoadConv -> Error on get conversation info from db : " + err);
                dataObj = {
                    result: "falied",
                    reason: "db_find_err",
                    data: []
                };
                sendMessageToOne("convResult", dataObj, msgObj.from);
                return;
            }

            // Send result to the messenger..
            dataObj = {
                result: "success",
                reason: "",
                data: convList
            };
            sendMessageToOne("convResult", dataObj, msgObj.from);
            console.log("Conv Result --------------");
            console.log(convList);

        });
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send message from one user to all other users..
    socket.on('toAll',function(msgObj){
        /*
         format:{
            from:{
                name:"",
                img:"",
                id:""
            },
            msg:""
         }
        */
        socket.broadcast.emit('toAll', msgObj);
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to all other users..
    socket.on('fileToOne',function(msgObj){
        /*
         format:{
             id: timeID,
             state: "ND", / "AS"
             type : "ONE",
             contact_id: userSelected.contact_id,
             from : userSelf.email,
             to : userSelected.email,
             filePath: filePath,
             fileIcon: fileIcon
         }
         */

        if(msgObj != null) {
            // Get save result of message..
            saveFileToDB(msgObj);

            var sendResult = false;
            var receiver;
            // Send message to receiver if success..
            if (msgObj.to == "Concierge") {
                receiver = concierge;
            }
            else {
                receiver = msgObj.to;
            }

            UserDB.findOne({'local.email': receiver}, function (err, gotUser) {
                if (err) {
                    console.log("LoadMsgBudge -> Error on get user info from db : " + err);
                    return;
                }

                if (!gotUser) {
                    console.log("LoadMsgBudge -> Can't read user info from db : " + gotUser);
                    return;
                }

                var contact = gotUser.local.contacts.find(function (oneContact) {
                    return oneContact.contact_id === msgObj.contact_id;
                });

                // Send data to the receiver..
                var dataObj = {
                    id: msgObj.id,
                    state: msgObj.state,
                    type: msgObj.type,
                    msg_budge: contact.msg_budge + 1,
                    contact_id: msgObj.contact_id,
                    from: msgObj.from,
                    to: msgObj.to,
                    filePath: msgObj.filePath,
                    fileIcon: msgObj.fileIcon
                };
                sendMessageToOne('fileToOne', dataObj, receiver);

                // Update data..
                var updateContact = {
                    state: contact.state,
                    contact_id: contact.contact_id,
                    msg_budge: contact.msg_budge + 1,
                    username: contact.username,
                    email: contact.email,
                    img: contact.img
                };

                gotUser.local.contacts.splice(gotUser.local.contacts.indexOf(contact), 1);
                gotUser.local.contacts.push(updateContact);

                gotUser.save(function (err) {
                    if (err) {
                        console.log("SaveMsgBudge -> Error on saving budge number : " + gotUser);
                        return;
                    }
                });
            });
        }
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to all other users..
    socket.on('fileToGrp',function(msgObj){
        /*
         format:{
             id: timeID,
             state: "ND",
             type : "GRP",
             grpID : grpSelected.grpID,
             from : userSelf.email,
             to : grpSelected.grpUsers,
             filePath: filePath,
             fileIcon: fileIcon
         }
         */

        // Get save result of message..
        saveFileToDB(msgObj);

        for(var i in msgObj.to) {
            var oneUser = msgObj.to[i];
            if(oneUser.email == msgObj.from)
                continue;

            var receiver;
            // Send message to receiver if success..
            if(oneUser.email == "Concierge") {
                receiver = concierge;
            }
            else {
                receiver = oneUser.email;
            }

            sendDataToGrpUser(receiver, msgObj, "FILE");

            // UserDB.findOne({'local.email' : receiver}, function(err, gotUser) {
            //     if (err) {
            //         console.log("LoadMsgBudge -> Error on get user info from db : " + err);
            //         return;
            //     }
            //
            //     if (!gotUser) {
            //         console.log("LoadMsgBudge -> Can't read user info from db : " + gotUser);
            //         return;
            //     }
            //
            //     var contact = gotUser.local.grp_contacts.find(function(oneContact) {
            //         return oneContact.grpID === msgObj.grpID;
            //     });
            //
            //     // Send data to the receiver..
            //     var dataObj = {
            //         id: msgObj.id,
            //         state: msgObj.state,
            //         type: msgObj.type,
            //         msg_budge: contact.msg_budge + 1,
            //         grpID: msgObj.grpID,
            //         from: msgObj.from,
            //         to: oneUser.email,
            //         filePath: msgObj.filePath,
            //         fileIcon: msgObj.fileIcon
            //     };
            //     sendMessageToOne('fileToOne', dataObj, receiver);
            //
            //     // Update data..
            //     var updateContact = {
            //         grpID: contact.grpID,
            //         grpName: contact.grpName,
            //         msg_budge: contact.msg_budge + 1,
            //         grpUsers: contact.grpUsers
            //     };
            //
            //     gotUser.local.grp_contacts.splice(gotUser.local.grp_contacts.indexOf(contact), 1);
            //     gotUser.local.grp_contacts.push(updateContact);
            //
            //     gotUser.save(function(err) {
            //         if (err) {
            //             console.log("SaveMsgBudge -> Error on saving budge number : " + gotUser);
            //             return;
            //         }
            //     });
            // });
        }
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to all other users..
    socket.on('imgToOne',function(msgObj){
        /*
         format:{
             id: timeID,
             state: "ND",
             type : "ONE",
             contact_id: userSelected.contact_id,
             from : userSelf.email,
             to : userSelected.email,
             filePath: filePath,
             img : e.target.result
         }
        */

        if(msgObj.flag == "false") {
        }
        if(msgObj != null) {
            // Get save result of message..
            saveImageToDB(msgObj);

            var sendResult = false;
            var receiver;
            // Send message to receiver if success..
            if (msgObj.to == "Concierge") {
                receiver = concierge;
            }
            else {
                receiver = msgObj.to;
            }

            UserDB.findOne({'local.email': receiver}, function (err, gotUser) {
                if (err) {
                    console.log("LoadMsgBudge -> Error on get user info from db : " + err);
                    return;
                }

                if (!gotUser) {
                    console.log("LoadMsgBudge -> Can't read user info from db : " + gotUser);
                    return;
                }

                var contact = gotUser.local.contacts.find(function (oneContact) {
                    return oneContact.contact_id === msgObj.contact_id;
                });

                // Send data to the receiver..
                var dataObj = {
                    id: msgObj.id,
                    state: msgObj.state,
                    type: msgObj.type,
                    msg_budge: contact.msg_budge + 1,
                    contact_id: msgObj.contact_id,
                    from: msgObj.from,
                    to: msgObj.to,
                    img: msgObj.img
                };
                sendMessageToOne('imgToOne', dataObj, receiver);

                // Update data..
                var updateContact = {
                    state: contact.state,
                    contact_id: contact.contact_id,
                    msg_budge: contact.msg_budge + 1,
                    username: contact.username,
                    email: contact.email,
                    img: contact.img
                };

                gotUser.local.contacts.splice(gotUser.local.contacts.indexOf(contact), 1);
                gotUser.local.contacts.push(updateContact);

                gotUser.save(function (err) {
                    if (err) {
                        console.log("SaveMsgBudge -> Error on saving budge number : " + gotUser);
                        return;
                    }
                });
            });
        }
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to all other users..
    socket.on('imgToGrp',function(msgObj){
        /*
         format:{
             type : "GRP",
             grpID : grpSelected.grpID,
             from : userSelf.email,
             to : grpSelected.grpUsers [],
             img : e.target.result
         }
         */

        // Get save result of message..
        saveImageToDB(msgObj);

        for(var i in msgObj.to) {
            var oneUser = msgObj.to[i];
            if(oneUser.email == msgObj.from)
                continue;

            var receiver;
            // Send message to receiver if success..
            if(oneUser.email == "Concierge") {
                receiver = concierge;
            }
            else {
                receiver = oneUser.email;
            }

            sendDataToGrpUser(receiver, msgObj, "IMG");

            // UserDB.findOne({'local.email' : receiver}, function(err, gotUser) {
            //     if (err) {
            //         console.log("LoadMsgBudge -> Error on get user info from db : " + err);
            //         return;
            //     }
            //
            //     if (!gotUser) {
            //         console.log("LoadMsgBudge -> Can't read user info from db : " + gotUser);
            //         return;
            //     }
            //
            //     var contact = gotUser.local.grp_contacts.find(function(oneContact) {
            //         return oneContact.grpID === msgObj.grpID;
            //     });
            //
            //     // Send data to the receiver..
            //     var dataObj = {
            //         id: msgObj.id,
            //         state: msgObj.state,
            //         type: msgObj.type,
            //         msg_budge: contact.msg_budge + 1,
            //         grpID: msgObj.grpID,
            //         from: msgObj.from,
            //         to: receiver,
            //         img: msgObj.img
            //     };
            //     sendMessageToOne('imgToOne', dataObj, receiver);
            //
            //     // Update data..
            //     var updateContact = {
            //         grpID: contact.grpID,
            //         grpName: contact.grpName,
            //         msg_budge: contact.msg_budge + 1,
            //         grpUsers: contact.grpUsers
            //     };
            //
            //     gotUser.local.grp_contacts.splice(gotUser.local.grp_contacts.indexOf(contact), 1);
            //     gotUser.local.grp_contacts.push(updateContact);
            //
            //     gotUser.save(function(err) {
            //         if (err) {
            //             console.log("SaveMsgBudge -> Error on saving budge number : " + gotUser);
            //             return;
            //         }
            //     });
            // });
        }
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to another..
    socket.on('msgToOne',function(msgObj){
        /*
         msgObj format:{
             id: timeID,
             state: "NS",
             type: "ONE",
             contact_id:    contact id of conversation...
             from: ""       // email of sender,
             to: "",        // email of receiver.. / Concierge
             msg: ""
         }
        */

        if(msgObj != null) {
            // Get save result of message..
            saveMessageToDB(msgObj);

            var sendResult = false;
            var receiver;
            // Send message to receiver if success..
            if(msgObj.to == "Concierge") {
                receiver = concierge;
            }
            else {
                receiver = msgObj.to;
            }

            UserDB.findOne({'local.email' : receiver}, function(err, gotUser) {
                if (err) {
                    console.log("LoadMsgBudge -> Error on get user info from db : " + err);
                    return;
                }

                if (!gotUser) {
                    console.log("LoadMsgBudge -> Can't read user info from db : " + gotUser);
                    return;
                }

                var contact = gotUser.local.contacts.find(function(oneContact) {
                    return oneContact.contact_id === msgObj.contact_id;
                });

                // Send data to the receiver..
                var dataObj = {
                    id: msgObj.id,
                    state: msgObj.state,
                    type: msgObj.type,
                    msg_budge: contact.msg_budge + 1,
                    contact_id: msgObj.contact_id,
                    from: msgObj.from,
                    to: msgObj.to,
                    msg: msgObj.msg
                };
                sendMessageToOne('msgToOne', dataObj, receiver);

                // Update data..
                var updateContact = {
                    state: contact.state,
                    contact_id: contact.contact_id,
                    msg_budge: contact.msg_budge + 1,
                    username: contact.username,
                    email: contact.email,
                    img: contact.img
                };

                gotUser.local.contacts.splice(gotUser.local.contacts.indexOf(contact), 1);
                gotUser.local.contacts.push(updateContact);

                gotUser.save(function(err) {
                    if (err) {
                        console.log("SaveMsgBudge -> Error on saving budge number : " + gotUser);
                        return;
                    }
                });
            });
        }
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to another..
    socket.on('resetBudge',function(msgObj){
        /*
         msgObj format:{
             type: msgObj.type,
             email: userSelf.email,
             contact_id: contact_id
         }
         */
        if(msgObj.type == "GRP") {
            resetUserMsgBudge(msgObj.email, msgObj.contact_id, true);
        }
        else {
            resetUserMsgBudge(msgObj.email, msgObj.contact_id, false);
        }
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to another..
    socket.on('msgToGrp',function(msgObj){
        /*
         var msgObj = {
             id: timeID,
             state: "ND",
             type : "GRP",
             grpID : grpSelected.grpID,
             from : userSelf.email,
             to : grpSelected.grpUsers,
             msg : msg.val()
         };
         */

        saveMessageToDB(msgObj);
        for(var i in msgObj.to) {
            var oneUser = msgObj.to[i];
            if(oneUser.email == msgObj.from)
                continue;

            var receiver;
            // Send message to receiver if success..
            if(oneUser.email == "Concierge") {
                receiver = concierge;
            }
            else {
                receiver = oneUser.email;
            }

            sendDataToGrpUser(receiver, msgObj, "TEXT");

            // UserDB.findOne({'local.email' : receiver}, function(err, gotUser) {
            //     if (err) {
            //         console.log("LoadMsgBudge -> Error on get user info from db : " + err);
            //         return;
            //     }
            //
            //     if (!gotUser) {
            //         console.log("LoadMsgBudge -> Can't read user info from db : " + gotUser);
            //         return;
            //     }
            //
            //     var contact = gotUser.local.grp_contacts.find(function(oneContact) {
            //         return oneContact.grpID === msgObj.grpID;
            //     });
            //
            //     // Send data to the receiver..
            //     var dataObj = {
            //         id: msgObj.id,
            //         state: msgObj.state,
            //         type: msgObj.type,
            //         msg_budge: contact.msg_budge + 1,
            //         grpID: msgObj.grpID,
            //         from: msgObj.from,
            //         to: oneUser.email,
            //         msg: msgObj.msg
            //     };
            //     sendMessageToOne('msgToOne', dataObj, receiver);
            //
            //     // Update data..
            //     var updateContact = {
            //         grpID: contact.grpID,
            //         grpName: contact.grpName,
            //         msg_budge: contact.msg_budge + 1,
            //         grpUsers: contact.grpUsers
            //     };
            //
            //     gotUser.local.grp_contacts.splice(gotUser.local.grp_contacts.indexOf(contact), 1);
            //     gotUser.local.grp_contacts.push(updateContact);
            //
            //     gotUser.save(function(err) {
            //         if (err) {
            //             console.log("SaveMsgBudge -> Error on saving budge number : " + gotUser);
            //             return;
            //         }
            //     });
            // });
        }
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to another..
    socket.on('msgToBot',function(msgObj){
        /*
         msgObj format:{
             type : "BOT",
             from: ""  // email of sender,
             msg: {
                type: "Connect" / "firstChoice" / "filter1" / "filter2" / "new"
                msgData: ""
         }
         */

        sendBotMessage(msgObj);
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send invite to the specified mail address..
    socket.on('invite', function(inviteInfo) {
        /*
            inviteInfo {
                 from: sender email
                 password : sender password
                 to: email to receive
            }
        */
        var transport = nodemailer.createTransport('smtps://timkern0702%40gmail.com:xlaxjs0702@smtp.gmail.com/?pool=true');
        var htmlLink = '<h1>Invite you to the chat!</h1><br>' + inviteInfo.from + ' sent you a invite to the chat!<br>'
                        + '<p><a href="http://localhost:8000">Visit page</a></p>';
        var mailOptions = {
            // from: inviteInfo.from,
            // to: inviteInfo.to,
            from: 'timkern0702@gmail.com',
            to: inviteInfo.to,
            // to: 'devandparse14@outlook.com',
        	subject: 'Invite to the chat!!',
            // text: inviteInfo.from + ' sent you a invite to the chat!!'
        	html : htmlLink
        };

        transport.sendMail(mailOptions, function(error, info){
            var receiver = connectedUserList.find(function(user) {
                return user.email === inviteInfo.from;
            });

            if(receiver) {
                var toSocket = io.sockets.connected[receiver.id];

                if (error){
                    console.log("Error on send mail : ", error);
                    toSocket.emit('inviteErr', 'ERR : ' + error.message);
                } else {
                    console.log("Message sent : " + info.response);
                    toSocket.emit('inviteResponse', 'Response : ' + info.response);
                }
            }
            transport.close();
        });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send invite to the specified mail address..
    socket.on('shareBoardToEmail', function(inviteInfo) {
        /*
         inviteInfo {
             from: sender email
             to: email to receive
         }
         */
        // var transport = nodemailer.createTransport('smtps://proquerio%40gmail.com:d1YoT6M5Aecy@smtp.gmail.com');
        var transport = nodemailer.createTransport('smtps://timkern0702%40gmail.com:xlazjs0702@smtp.gmail.com');
        var htmlLink = '<h1>Invite you to view the board!</h1><br>' + inviteInfo.from + ' sent you a invite to view shared board!<br>'
                        + '<p><a href="http://localhost:8000">Visit page</a></p>';
        var mailOptions = {
            // from: inviteInfo.from,
            // to: inviteInfo.to,
            from: 'timkern0702@gmail.com',
            to: inviteInfo.to,
            // to: 'devandparse14@outlook.com',
            subject: 'Invite to view board!!',
            // text: inviteInfo.from + ' sent you a invite to the chat!!'
            html : htmlLink
        };

        transport.sendMail(mailOptions, function(error, info){
            var receiver = connectedUserList.find(function(user) {
                return user.email === inviteInfo.from;
            });

            if(receiver) {
                var toSocket = io.sockets.connected[receiver.id];
                var dataObj;

                if (error){
                    console.log("Error on send mail : ", error);
                    dataObj = {
                        result: "failed",
                        info: error.message
                    };
                } else {
                    console.log("Message sent : " + info.response);
                    dataObj = {
                        result: "success",
                        info: "Success to invite"
                    };
                }
                toSocket.emit('shareBoardResult', dataObj);
            }
            transport.close();
        });

        // dataObj = {
        //     result: "success",
        //     info: "Success to invite"
        // };
        // toSocket.emit('shareBoardResult', dataObj);
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send invite to the specified mail address..
    socket.on('notice', function(noticeInfo) {
        /*
         inviteInfo {
             from:{
                email: sender email,
                username: sender username
            }
         }
         */

        var transport = nodemailer.createTransport('smtps://proquerio%40gmail.com:d1YoT6M5Aecy@smtp.gmail.com/?pool=true');
        var htmlLink = '<h1>Please read the message from users!</h1><br>' +
                            noticeInfo.from.username + '(' + noticeInfo.from.email + ')' + ' just sent a message to concierge!<br>'
                            + '<p><a href="http://localhost:8000">Visit page</a></p>';
        var mailOptions = {
            // from: noticeInfo.from,
            // to: noticeInfo.to,
            from: 'proquerio@gmail.com',
            // to: noticeInfo.to,
            to: 'proquerio@gmail.com',
            subject: "Someone just sent a message to concierge!",
            // text: noticeInfo.from + ' sent you a invite to the chat!!'
            html : htmlLink
        };

        transport.sendMail(mailOptions, function(error, info){
            var receiver = connectedUserList.find(function(user) {
                return user.email === noticeInfo.from.email;
            });

            if(receiver) {
                var toSocket = io.sockets.connected[receiver.id];

                if (error){
                    console.log(error);
                    toSocket.emit('noticeErr', 'ERR : ' + error.message);
                } else {
                    console.log("Message sent : " + info.response);
                    toSocket.emit('noticeResponse', 'Response : ' + info.response);
                }
            }
            transport.close();
        });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Add a collaborator to the board..
    socket.on('addCollaborator',function(msgObj){
        /*
         msgObj format:{
            from: sender.email,
            info: user name or email to add
        }
         */

        // Get user information from database..
        UserDB.findOne({
            $or: [
                {'local.email': msgObj.info},
                {'local.username': msgObj.info}
            ]
        }, function(err, gotUser) {
            if (err) {
                console.log("addCollaborator -> Error on get user info from db : " + err);
                return;
            }

            var msgData = {};
            if (gotUser) {
                // Search the user information of self searcher and remove it..
                msgData = {
                    result: "found",
                    info: gotUser.local
                };
            }
            else {
                msgData = {
                    result: "nofound"
                };
            }

            sendMessageToOne("addCollaborator", msgData, msgObj.from);
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Create board and send to user..
    socket.on('createboard',function(msgObj){
        /*
         var msgObj = {
             creater: userself.email,
             title: boardName,
             description: boardDescription,
             public: pub,
             category: "",
             collaboratorList = [
             {
                  username: usersname,
                  email: email
             }
         }
         */

        var oneBoard = new BoardDB();
        oneBoard.title = msgObj.title;
        oneBoard.id = msgObj.creater + getTimeStamp();
        oneBoard.creater = msgObj.creater;
        oneBoard.description = msgObj.description;
        oneBoard.category = msgObj.category;
        oneBoard.pubflag = msgObj.public;
        oneBoard.collaborators = msgObj.collaborators;

        oneBoard.save(function (err) {
            if (err) {
                console.log("CreateBoard -> Error on saving data to DB : " + err);
                var dataObj = {
                    result: "failed",
                    reason: "db_err_create_board",
                    data: []
                };
                sendMessageToOne("boardResult", dataObj, msgObj.creater);
                return;
            }

            sendBoardResult(msgObj.creater);                            // For create board to creater..
            for(var i in msgObj.collaborators) {
                if(msgObj.collaborators[i].email == msgObj.from)
                    continue;

                sendBoardResult(msgObj.collaborators[i].email);         // For create board to others..
            }
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Edit board and send data..
    socket.on('editboard',function(msgObj){
        /*
         var msgObj = {
             id: board id,
             creater: userself.email,
             name: boardName,
             description: boardDescription,
             public: pub,
             category: "",
             collaborators = [
             {
                 username: usersname,
                 email: email,
                 right: "MODIFY" / "NOT", ...
             }
         }
         */

        BoardDB.findOne({'id': msgObj.id}, function(err, oneBoard) {
            if(err) {
                console.log("EditBoard -> Error on find data from DB : " + err);
                var dataObj = {
                    result: "failed",
                    reason: "db_err_find_board",
                    data: []
                };
                sendMessageToOne("boardResult", dataObj, msgObj.creater);
                return;
            }

            if(!oneBoard) {
                console.log("EditBoard -> No update data from DB : " + err);
                var dataObj = {
                    result: "failed",
                    reason: "db_err_no_board",
                    data: []
                };
                sendMessageToOne("boardResult", dataObj, msgObj.creater);
                return;
            }

            // Update data..
            oneBoard.title = msgObj.title;
            oneBoard.description = msgObj.description;
            oneBoard.category = msgObj.category;
            oneBoard.pubflag = msgObj.public;
            oneBoard.collaborators = msgObj.collaborators;
            oneBoard.save(function (err) {
                var dataObj = {};
                if (err) {
                    console.log("EditBoard -> Error on updating data to DB : " + err);
                    dataObj = {
                        result: "failed",
                        reason: "db_err_update_board",
                        data: []
                    };
                    sendMessageToOne("boardResult", dataObj, msgObj.creater);
                    return;
                }

                sendBoardResult(msgObj.creater);                            // For edit board for editor..
                for(var i in msgObj.collaborators) {
                    if(msgObj.collaborators[i].email == msgObj.from)
                        continue;

                    sendBoardResult(msgObj.collaborators[i].email);         // For edit board to others..
                }
            });
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Remove board and send..
    socket.on('removeboard',function(msgObj){
        /*
         var msgObj = {
             id: board id,
             from: email
         }
         */

        BoardDB.findOne({'id': msgObj.boardID}, function(err, oneBoard) {
            if(err) {
                console.log("RemoveBoard -> Error on find data from DB : " + err);
                var dataObj = {
                    result: "failed",
                    reason: "db_err_find_board",
                    data: []
                };
                sendMessageToOne("boardResult", dataObj, msgObj.from);
            }

            if(!oneBoard) {
                console.log("RemoveBoard -> No remove data from DB : " + err);
                var dataObj = {
                    result: "failed",
                    reason: "db_err_no_board",
                    data: []
                };
                sendMessageToOne("boardResult", dataObj, msgObj.from);
                return;
            }

            var collaborators = oneBoard.collaborators;

            oneBoard.remove(function (err, wrtResult) {
                var dataObj = {};
                if (err) {
                    console.log("RemoveBoard -> Error on removing data to DB : " + err);
                    dataObj = {
                        result: "failed",
                        reason: "db_err_remove_board",
                        data: []
                    };
                    sendMessageToOne("boardResult", dataObj, msgObj.from);
                    return;
                }

                sendBoardResult(msgObj.from);                           // For remove board to remover..
                for(var i in collaborators) {
                    if(collaborators[i].email == msgObj.from)
                        continue;

                    sendBoardResult(collaborators[i].email);         // For remove board to others..
                }
            });
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Edit board and send data..
    socket.on('boardThumb',function(msgObj) {
        /*
         msgObj = {
            from : user email..
            boardID : board id..
        }
        */

        BoardDB.findOne({ id: msgObj.boardID }, function(err, boardData) {
            var boardImgList = boardData.data_contents;
            var listCount = boardImgList.length;
            for(var i = 0; i < 4; i++) {
                if(i >= listCount) {
                    console.log("Read board image data -> No data!");
                    var dataObj = {
                        imgID: i,
                        result: "failed",
                        url: msgObj.url,
                        boardID: msgObj.boardID,
                        reason: "no_data",
                        data: []
                    };
                    sendMessageToOne("boardThumb", dataObj, msgObj.from);
                    return;
                }

                var filePath = __dirname + '/uploads/board_data/' + boardImgList[i].url;
                sendBoardThumbImg(boardImgList[i].url, i, msgObj, filePath);
            }
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Edit board and send data..
    socket.on('addToBoard',function(msgObj){
        /*
         var msgObj = {
            boardID : board id..
            from : user email..
         }
         */

        var boardData = user_board_data.find(function(oneData) {
            return oneData.email === msgObj.from;
        });
        // var boardData = {
        //     email: uploadUser,
        //     boardImg: [
        //         {
        //             url: filePath,
        //             filename: file.name,
        //             description: ""
        //         }
        //     ]
        // };


        if(!boardData) {
            // Send result of board data..
            console.log("addToBoard -> Error on finding board data to DB : " + boardData);
            var dataObj = {
                boardID: msgObj.boardID,
                result: "failed",
                reason: "err_find_board_data",
                data: []
            };

            sendMessageToOne("boardImgResult", dataObj, msgObj.from);
            return;
        }

        BoardDB.findOne({'id': msgObj.boardID}, function(err, oneBoard) {
            if(err) {
                console.log("AddImgToBoard -> Error on find board data from DB : " + err);
                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "failed",
                    reason: "db_err_find_board",
                    data: []
                };
                // Send result of board image..
                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                return;
            }

            if(!oneBoard) {
                console.log("AddImgToBoard -> No update board data from DB : " + err);
                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "failed",
                    reason: "db_err_no_board",
                    data: []
                };
                // Send result..
                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                return;
            }

            // Update board data..
            for(var i in boardData.boardImg) {
                oneBoard.data_contents.push(boardData.boardImg[i]);
            }

            // Remove temp list of board image data..
            user_board_data.splice(user_board_data.indexOf(boardData), 1);

            // Set collaborators..
            var collaborators = oneBoard.collaborators;

            // oneBoard.data_contents = boardData;
            oneBoard.save(function (err) {
                var dataObj = {};
                if (err) {
                    console.log("AddImgToBoard -> Error on updating board data to DB : " + err);
                    var dataObj = {
                        boardID: msgObj.boardID,
                        result: "failed",
                        reason: "db_err_update_board",
                        data: []
                    };
                    sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                    return;
                }

                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "success",
                    reason: "",
                    data: oneBoard.data_contents
                };
                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                for(var i in collaborators) {
                    if(collaborators[i].email == msgObj.from)
                        continue;

                    sendBoardResult(collaborators[i].email);              // For add new image to board to collaborators..
                }
                console.log("AddImgToBoard -> SUCCESS");
            });
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Edit board and send data..
    socket.on('pinToBoard',function(msgObj){
        /*
         var msgObj = {
             from: userSelf.email,
             boardID: board_id,
             imgPath: selectedImgPath,
             description: ""
         }
         */

        if(msgObj.imgPath == undefined) {
            return;
        }

        // Copy to board..
        var rootPath = __dirname + '/uploads';
        var fromPath = rootPath + msgObj.imgPath;
        var fileName = msgObj.imgPath.substring(msgObj.imgPath.indexOf("_", 10) + 1);
        var timeStamp = (new Date()).getTime();
        var url = msgObj.from + "/board" + timeStamp + "_" + fileName;
        var uploadPath = rootPath + "/board_data/";
        var toPath = uploadPath + url;
        // store all uploads in the /uploads directory
        fs.mkdir(uploadPath + msgObj.from, function(err) {
            if(err && err.code != "EEXIST") {
                console.log("Error on create directory : ", err);
            }
            return;
        });

        fs.createReadStream(fromPath).pipe(fs.createWriteStream(toPath));

        // Add to the board..
        BoardDB.findOne({'id': msgObj.boardID}, function(err, oneBoard) {
            if(err) {
                console.log("AddImgToBoard -> Error on find board data from DB : " + err);
                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "failed",
                    reason: "db_err_find_board",
                    data: []
                };
                // Send result of board image..
                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                return;
            }

            if(!oneBoard) {
                console.log("AddImgToBoard -> No update board data from DB : " + err);
                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "failed",
                    reason: "db_err_no_board",
                    data: []
                };
                // Send result..
                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                return;
            }

            // Create data content..
            var boardContent = {
                url: url,
                filename: fileName,
                description: ""
            };
            oneBoard.data_contents.push(boardContent);

            // Set collaborators..
            var collaborators = oneBoard.collaborators;

            // oneBoard.data_contents = boardData;
            oneBoard.save(function (err) {
                var dataObj = {};
                if (err) {
                    console.log("AddImgToBoard -> Error on updating board data to DB : " + err);
                    var dataObj = {
                        boardID: msgObj.boardID,
                        result: "failed",
                        reason: "db_err_update_board",
                        data: []
                    };
                    sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                    return;
                }

                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "success",
                    reason: "",
                    data: oneBoard.data_contents
                };
                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                for(var i in collaborators) {
                    if(collaborators[i].email == msgObj.from)
                        continue;

                    sendBoardResult(collaborators[i].email);              // For pin image to board to collaborators..
                }
                console.log("AddImgToBoard -> SUCCESS");
            });
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Edit board and send data..
    socket.on('removeFromBoard',function(msgObj){
        /*
         var msgObj = {
             boardID : board_id,
             from: userSelf.email,
             url: url
         }
         */

        BoardDB.findOne({'id' : msgObj.boardID}, function (err, oneBoard) {
            if (err) {
                console.log("RemoveFromBoard -> Error on finding board data from DB : " + err);
                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "failed",
                    reason: "err_find_board_data",
                    data: []
                };

                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                return;
            }

            if(!oneBoard) {
                console.log("RemoveFromBoard -> No update board data from DB : " + err);
                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "failed",
                    reason: "db_err_no_board",
                    data: []
                };
                // Send result..
                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                return;
            }

            // Set collaborators..
            var collaborators = oneBoard.collaborators;

            // Update board data..
            var boardImgData = oneBoard.data_contents;

            // Remove temp list of board image data..
            var oneImgData = boardImgData.find(function(imgData) {
                return imgData.url === msgObj.url;
            })
            boardImgData.splice(boardImgData.indexOf(oneImgData), 1);

            // Update..
            oneBoard.save(function (err) {
                var dataObj = {};
                if (err) {
                    console.log("RemoveFromBoard -> Error on updating board data to DB : " + err);
                    var dataObj = {
                        boardID: msgObj.boardID,
                        result: "failed",
                        reason: "db_err_update_board",
                        data: []
                    };
                    sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                    return;
                }

                var dataObj = {
                    boardID: msgObj.boardID,
                    result: "success",
                    reason: "",
                    data: oneBoard.data_contents
                };
                sendMessageToOne("boardImgResult", dataObj, msgObj.from);
                for(var i in collaborators) {
                    if(collaborators[i].email == msgObj.from)
                        continue;

                    sendBoardResult(collaborators[i].email);              // For remove a image from board to collaborators..
                }
                console.log("RemoveFromBoard -> SUCCESS");
            });
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Clear history of add board and send data..
    socket.on('canelAddBoard',function(msgObj){
        /*
         var msgObj = {
             boardID : board id..
             from : user email..
         }
         */

        var boardData = user_board_data.find(function(oneData) {
            return oneData.email === msgObj.from;
        });

        // Remove temp list of board image data..
        user_board_data.splice(user_board_data.indexOf(boardData), 1);
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Edit board and send data..
    socket.on('board_img',function(msgObj){
        /*
         var msgObj = {
             from: userSelf.email,
             boardID: board_id,
             url: imgList[i].filename,
         }
         */

        var filePath = __dirname + '/uploads/board_data/' + msgObj.url;
        fs.readFile(filePath, function(err, data){
            if ( err ) {
                console.log("Read board image data -> Error on reading file : " + err);
                var dataObj = {
                    result: "failed",
                    url: msgObj.url,
                    reason: "read_file_err",
                    data: []
                };
                sendMessageToOne("board_img", dataObj, msgObj.from);
            }else{
                console.log("SUCCESS ON READING IMAGE FILE : " + msgObj.url);
                var dataObj = {
                    result: "success",
                    url: msgObj.url,
                    reason: "",
                    data: data.toString('base64')
                };
                sendMessageToOne("board_img", dataObj, msgObj.from);
            }
        });
    });



    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Search user and send information..
    socket.on('ssPerson',function(msgObj){
        /*
         format:{
             from: userSelf.email,
             content: search
         }
         */

        // Get user information from database..
        UserDB.find({
            $or: [
                {'local.email': {$regex: msgObj.content}},
                {'local.username': {$regex: msgObj.content}}
            ]
        }, function(err, searchList) {
            if (err) {
                console.log("searchSharePerson -> Error on get user info from db : " + err);
                return;
            }

            var msgData = [];
            if (searchList) {
                // Search the user information of self searcher and remove it..
                var user = searchList.find(function(oneUser) {
                    return oneUser.local.email === msgObj.from;
                });
                if(user) {
                    // Remove user from list..
                    searchList.splice(searchList.indexOf(user), 1);
                }

                msgData = searchList;
            }

            sendMessageToOne("ssResult", msgData, msgObj.from);
        });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Search user and send information..
    socket.on('searchPerson',function(msgObj){
        /*
         format:{
            from:{
                 username : name of user logged in,
                 email : ,
                 password : ,
            },
            content:""
         }
         */

        // Get user information from database..
        UserDB.find({
                $or: [
                    {'local.email': {$regex: msgObj.content}},
                    {'local.username': {$regex: msgObj.content}}
                ]
            }, function(err, searchList) {
            if (err) {
                console.log("searchPerson -> Error on get user info from db : " + err);
                return;
            }

            var msgData = [];
            if (searchList) {
                // Search the user information of self searcher and remove it..
                var user = searchList.find(function(oneUser) {
                    return oneUser.local.email === msgObj.from.email;
                });
                if(user) {
                    // Remove user from list..
                    searchList.splice(searchList.indexOf(user), 1);
                }

                msgData = searchList;
            }

            sendMessageToOne("searchResult", msgData, msgObj.from.email);
        });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Add a user to the contact list and send result..
    socket.on('addToContact',function(msgObj){
        /*
         format:{
             from:{
                 username : name of user logged in,
                 email : ,
                 password : ,
                 img: ,
             },
             toAdd: {
                 state: state of contact,
                 contact_id: contact_id,
                 msg_budge: 0,
                 username : username,
                 email: email,
                 img: ,
             }
         }
         */

        // Find user database at the sender side..
        UserDB.findOne({ 'local.email' :  msgObj.from.email },
            function(err, gotUser) {
                if (err) {
                    console.log("AddToContact(sender) -> Error on get user info from db : " + err);
                    return;
                }

                if (!gotUser) {
                    console.log("AddToContact(sender) -> Can't read user info from db : " + msgObj);
                    return;
                }

                // Get user list of current user..
                var userContacts = gotUser.local.contacts;
                // Find if the user to add a contact list is already added or not..
                var addedUser = userContacts.find(function(oneContact) {
                    return oneContact.email === msgObj.toAdd.email;
                });

                // If it is the user that already added, change state..
                if(addedUser)
                {
                    userContacts[userContacts.indexOf(addedUser)].state = msgObj.toAdd.state;
                }
                else {
                    userContacts.push(msgObj.toAdd);
                }

                // Update data..
                UserDB.update(
                    {'local.email': msgObj.from.email, 'local.password': msgObj.from.password},
                    {$set: {'local.contacts' : userContacts}},
                    function(err, result) {
                        var dataObj = {
                            "result": "",
                            "data": []
                        };

                        if (err) {
                            console.log("SENDER UPDATING FAILED ---------");
                            console.log("Error : " + err);
                            console.log("Result : " + result);
                            dataObj.result = "Failed";
                        }
                        else {
                            console.log("SENDER UPDATING SUCCESS ---------");
                            console.log("Modify Result : " + result.nModified);
                            dataObj.result = "Success";
                            dataObj.data = userContacts;
                        }
                        sendMessageToOne("addToContact", dataObj, msgObj.from.email);
                        return;
                    }
                );
            }
        );


        // Find user database at the receiver side..
        UserDB.findOne({ 'local.email' :  msgObj.toAdd.email },
            function(err, gotUser) {
                if (err) {
                    console.log("AddToContact(receiver) -> Error on get user info from db : " + err);
                    return [];
                }

                if (!gotUser) {
                    console.log("AddToContact(receiver) -> Can't read user info from db : " + msgObj);
                    return [];
                }

                // Get user list of current user..
                var userContacts = gotUser.local.contacts;
                // Find if the user to add a contact list is already added or not..
                var addedUser = userContacts.find(function(oneContact) {
                    return oneContact.email === msgObj.from.email;
                });

                // If it is the user that already added, change state..
                if(addedUser)
                {
                    userContacts[userContacts.indexOf(addedUser)].state = convertStateToAdd(msgObj.toAdd.state);
                }
                else {
                    var newContact = {
                        state: convertStateToAdd(msgObj.toAdd.state),
                        msg_budge: 0,
                        contact_id: msgObj.toAdd.contact_id,
                        username : msgObj.from.username,
                        email: msgObj.from.email,
                        img: msgObj.from.img
                    };
                    userContacts.push(newContact);
                }

                // Update data..
                UserDB.update(
                    {'local.email': msgObj.toAdd.email, 'local.username': msgObj.toAdd.username},
                    {$set: {'local.contacts' : userContacts}},
                    function(err, result) {
                        var dataObj = {
                            "result": "",
                            "data": []
                        };

                        if (err) {
                            console.log("RECEIVER UPDATING FAILED ---------");
                            console.log("Error : " + err);
                            console.log("Result : " + result);
                            dataObj.result = "Failed";
                        }
                        else {
                            console.log("RECEIVER UPDATING SUCCESS ---------");
                            console.log("Modify Result : " + result.nModified);
                            dataObj.result = "Success";
                            dataObj.data = userContacts;
                        }
                        sendMessageToOne("addToContact", dataObj, msgObj.toAdd.email);
                        return;
                    }
                );
            }
        );
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Add a user to the contact list and send result..
    socket.on('addConvGrp',function(msgObj) {{}
        /*
         format:{
             grpID: group ID,
             grpName: name..
             msg_budge: 0,
             grpUsers: [
                 oneUser: {
                     username: user name,
                     email: email
                     img: user image..
                 }
             ]
         }
         */

        // Find image of users to the database..
        for (var i = 0; i < msgObj.grpUsers.length; i++) {
            var oneGrpUser = msgObj.grpUsers[i];
            if(i == msgObj.grpUsers.length - 1) {
                setUserImage(oneGrpUser.email, msgObj, i, true);
            }
            else {
                setUserImage(oneGrpUser.email, msgObj, i, false);
            }
        }
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Add a user to the contact list and send result..
    socket.on('removeConvGrp',function(msgObj) {{}
        /*
         format:{
             from: sender.email,
             grp: group info {
                 grpID: group ID,
                 grpUsers: [
                    oneUser: {
                        username: user name,
                        email: email
                        img : img
                    }
                ]
            }
         }
         */

        var grpInfo = msgObj.grp;
        // Find image of users to the database..
        for (var i = 0; i < grpInfo.grpUsers.length; i++) {
            var oneGrpUser = grpInfo.grpUsers[i];
            UserDB.findOne({'local.email': oneGrpUser.email},
                function (err, gotUser) {
                    if (err) {
                        console.log("removeConvGrp(ToUsers) -> Error on get user info from db : " + err);
                        return;
                    }

                    if (!gotUser) {
                        console.log("removeConvGrp(ToUsers) -> Can't read user info from db : " + oneGrpUser.email);
                        return;
                    }

                    // Get group list of current user..
                    var userGrpContacts = gotUser.local.grp_contacts;
                    // Remove grp from a user..
                    var grpContact = userGrpContacts.find(function(oneGrpContact) {
                        return oneGrpContact.grpID === grpInfo.grpID;
                    });
                    if(!grpContact) {
                        return;
                    }

                    if(gotUser.local.email == msgObj.from) {
                        userGrpContacts.splice(userGrpContacts.indexOf(grpContact), 1);
                    }
                    else {
                        var index = userGrpContacts.indexOf(grpContact);
                        rmvUser = userGrpContacts[index].grpUsers.find(function(memUser) {
                           return memUser.email === msgObj.from;
                        });
                        if(!rmvUser) {
                            return;
                        }

                        if(userGrpContacts[index].grpUsers.length == 2) {
                            userGrpContacts.splice(userGrpContacts.indexOf(grpContact), 1);
                        }
                        else {
                            userGrpContacts[index].grpUsers.splice(userGrpContacts[index].grpUsers.indexOf(rmvUser), 1);
                        }
                    }

                    // Update data..
                    UserDB.update(
                        {'local.email': gotUser.local.email, 'local.username': gotUser.local.username},
                        {$set: {'local.grp_contacts': userGrpContacts}},
                        function (err, result) {
                            var dataObj = {
                                'result' : "",
                                'data' : []
                            }
                            if (err) {
                                console.log("USER UPDATING FAILED ---------");
                                console.log("Error : " + err);
                                console.log("Result : " + result);
                                dataObj.result = "Failed";
                            }
                            else {
                                console.log("USER UPDATING SUCCESS ---------");
                                console.log("Modify Result : " + result.nModified);
                                dataObj.result = "Success";
                                dataObj.data = userGrpContacts;
                            }
                            sendMessageToOne("removeConvGrp", dataObj, gotUser.local.email);
                        }
                    );
                }
            );
        }

        // var newConvGrp = GrpDB();
        // newConvGrp.grpID = msgObj.grpID;
        // newConvGrp.grpUsers = msgObj.grpUsers;
        // newConvGrp.save(function (err) {
        //     if (err) {
        //         console.log("addConvGrp -> Error on saving data to DB : " + err);
        //         return;
        //     }
        //
        // });
        //
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Remove a user from contact list and send result..
    socket.on('removeFromContact',function(msgObj){
        /*
         format:{
             from:{
                 username : name of user logged in,
                 email : ,
                 password : ,
             },
             toRemove: {
                 state: state of contact,
                 username : username,
                 email: email,
             }
         }
         */

        // Find user database at the sender side..
        UserDB.findOne({ 'local.email' :  msgObj.from.email },
            function(err, gotUser) {
                if (err) {
                    console.log("removeFromContact(sender) -> Error on get user info from db : " + err);
                    return;
                }

                if (!gotUser) {
                    console.log("removeFromContact(sender) -> Can't read user info from db : " + msgObj.from.email);
                    return;
                }

                // Get user list of current user..
                var userContacts = gotUser.local.contacts;
                // Find if the user to add a contact list is already added or not..
                var addedUser = userContacts.find(function(oneContact) {
                    return oneContact.email === msgObj.toRemove.email;
                });

                // If it is the user that already added, change state..
                if(addedUser)
                {
                    userContacts[userContacts.indexOf(addedUser)].state = msgObj.toRemove.state;
                }
                else {
                    return;
                }

                // Update data..
                UserDB.update(
                    {'local.email': msgObj.from.email, 'local.password': msgObj.from.password},
                    {$set: {'local.contacts' : userContacts}},
                    function(err, result) {
                        var dataObj = {
                            "result": "",
                            "data": []
                        };

                        if (err) {
                            console.log("SENDER UPDATING FAILED ---------");
                            console.log("Error : " + err);
                            console.log("Result : " + result);
                            dataObj.result = "Failed";
                        }
                        else {
                            console.log("SENDER UPDATING SUCCESS ---------");
                            console.log("Modify Result : " + result.nModified);
                            dataObj.result = "Success";
                            dataObj.data = userContacts;
                        }
                        sendMessageToOne("removeFromContact", dataObj, msgObj.from.email);
                        return;
                    }
                );
            }
        );


        // Find user database at the receiver side..
        UserDB.findOne({ 'local.email' :  msgObj.toRemove.email },
            function(err, gotUser) {
                if (err) {
                    console.log("removeFromContact(receiver) -> Error on get user info from db : " + err);
                    return [];
                }

                if (!gotUser) {
                    console.log("removeFromContact(receiver) -> Can't read user info from db : " + msgObj.from.email);
                    return [];
                }

                // Get user list of current user..
                var userContacts = gotUser.local.contacts;
                // Find if the user to add a contact list is already added or not..
                var addedUser = userContacts.find(function(oneContact) {
                    return oneContact.email === msgObj.from.email;
                });

                // If it is the user that already added, change state..
                if(addedUser && addedUser.state != "REMOVED")
                {
                    userContacts[userContacts.indexOf(addedUser)].state = convertStateToRemove(userContacts[userContacts.indexOf(addedUser)].state);
                }
                else {
                    return;
                }

                // Update data..
                UserDB.update(
                    {'local.email': msgObj.toRemove.email, 'local.username': msgObj.toRemove.username},
                    {$set: {'local.contacts' : userContacts}},
                    function(err, result) {
                        var dataObj = {
                            "result": "",
                            "data": []
                        };

                        if (err) {
                            console.log("RECEIVER UPDATING FAILED ---------");
                            console.log("Error : " + err);
                            console.log("Result : " + result);
                            dataObj.result = "Failed";
                        }
                        else {
                            console.log("RECEIVER UPDATING SUCCESS ---------");
                            console.log("Modify Result : " + result.nModified);
                            dataObj.result = "Success";
                            dataObj.data = userContacts;
                        }
                        sendMessageToOne("removeFromContact", dataObj, msgObj.toRemove.email);
                        return;
                    }
                );
            }
        );
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Update a group contact of a user..
    function setUserImage(userEmail, msgObj, index, update) {
        UserDB.findOne({'local.email': userEmail},
            function (err, gotUser) {
                if (err) {
                    console.log("getUserImage(ToUsers) -> Error on get user info from db : " + err);
                    return "";
                }

                if (!gotUser) {
                    console.log("getUserImage(ToUsers) -> Can't read user info from db : " + userEmail);
                    return "";
                }

                msgObj.grpUsers[index].img = gotUser.local.img;
                if(update == true) {
                    // Save new group chat information..
                    for (var i = 0; i < msgObj.grpUsers.length; i++) {
                        var oneGrpUser = msgObj.grpUsers[i];
                        updateGrpContacts(oneGrpUser.email, msgObj);
                    }
                }
            }
        );
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Update a group contact of a user..
    function updateGrpContacts(userEmail, grpInfo) {
       /*
       grpinfo = {
            grpID: group ID,
            grpName: name..
            msg_budge: 0,
            grpUsers: [
                oneUser: {
                    username: user name,
                    email: email
                    img: user image..
                }
            ]
        }
        */

        UserDB.findOne({'local.email': userEmail},
            function (err, gotUser) {
                if (err) {
                    console.log("addConvGrp(ToUsers) -> Error on get user info from db : " + err);
                    return;
                }

                if (!gotUser) {
                    console.log("addConvGrp(ToUsers) -> Can't read user info from db : " + userEmail);
                    return;
                }

                // Get group list of current user..
                var userGrpContacts = gotUser.local.grp_contacts;
                userGrpContacts.push(grpInfo);

                // Update data..
                UserDB.update(
                    {'local.email': gotUser.local.email, 'local.username': gotUser.local.username},
                    {$set: {'local.grp_contacts': userGrpContacts}},
                    function (err, result) {
                        var dataObj = {
                            'result' : "",
                            'data' : []
                        }
                        if (err) {
                            console.log("USER UPDATING FAILED ---------");
                            console.log("Error : " + err);
                            console.log("Result : " + result);
                            dataObj.result = "Failed";
                        }
                        else {
                            console.log("USER UPDATING SUCCESS ---------");
                            console.log("Modify Result : " + result.nModified);
                            dataObj.result = "Success";
                            dataObj.data = userGrpContacts;
                        }
                        sendMessageToOne("addConvGrp", dataObj, userEmail);
                        return;
                    }
                );
            }
        );
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Save conversation data to the database..
    function saveMessageToDB(msgObj) {
        /*
         msgObj format:{
             id: timeID,        // Id for the message box for the sender..
             state: "ND",       // state of message result - ND:Not determined, NS:Not sent
             type: "ONE", "GRP" // Type of message
             contact_id:        // contact id of conversation...
             grpID:             // Group id of conversation, type is "GRP" when defined..
             from: ""           // email of sender,
             to: "",            // email of receiver.. / Concierge
             msg: ""            // Content of message..
         }
         */

        var timestamp = (new Date()).getTime();
        timestamp = timestamp + (new Date()).getTimezoneOffset() * 60000;

        var convData = new ConvDB();

        if(msgObj.type == "ONE") {
            convData.conv_id = msgObj.contact_id;
        }
        else if(msgObj.type == "GRP") {
            convData.conv_id = msgObj.grpID;
        }

        convData.type = msgObj.type;
        convData.timestamp = timestamp;
        convData.from = msgObj.from;
        convData.msg_type = "TEXT";
        convData.msg_subtype = "TEXT";
        convData.msg_content = msgObj.msg;
        convData.save(function(err) {
            // Generate result object and send to the messenger..
            var msgResult;
            if(err) {
                console.log("SaveMessageToDB -> Error on saving conversation to db : " + err);
                // Send feed back to the messenger..
                msgResult = {
                    result: "false",
                    msgID: msgObj.id
                };
                sendMessageToOne('msgResult', msgResult, msgObj.from);
                return false;
            }

            console.log("SaveMessageToDB -> Success on saving conversation to db!");
            // Send success result to the messenger..
            msgResult = {
                result: "true",
                msgID: msgObj.id
            };
            sendMessageToOne('msgResult', msgResult, msgObj.from);
            return true;
        });
    };


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Save conversation data to the database..
    function saveImageToDB(msgObj) {
        /*
         msgObj format:{
             id: timeID,        // Id for the message box for the sender..
             state: "ND",       // state of message result - ND:Not determined, NS:Not sent
             type: "ONE", "GRP" // Type of message
             contact_id:        // contact id of conversation...
             grpID:             // Group id of conversation, type is "GRP" when defined..
             from: ""           // email of sender,
             to: "",            // email of receiver.. / Concierge
             filePath: ""       // File path that uploaded to the server..
             img: ""            // Content of image..
         }
         */

        var timestamp = (new Date()).getTime();
        timestamp = timestamp + (new Date()).getTimezoneOffset() * 60000;

        var convData = new ConvDB();

        if(msgObj.type == "ONE") {
            convData.conv_id = msgObj.contact_id;
        }
        else if(msgObj.type == "GRP") {
            convData.conv_id = msgObj.grpID;
        }

        convData.type = msgObj.type;
        convData.timestamp = timestamp;
        convData.from = msgObj.from;
        convData.msg_type = "IMG";
        convData.msg_subtype = msgObj.filePath;
        convData.msg_content = msgObj.img;
        convData.save(function(err) {
            // Generate result object and send to the messenger..
            var msgResult;
            if(err) {
                console.log("SaveImageToDB -> Error on saving image data to db : " + err);
                // Send feed back to the messenger..
                msgResult = {
                    result: "false",
                    msgID: msgObj.id
                };
                sendMessageToOne('msgResult', msgResult, msgObj.from);
                return false;
            }

            console.log("SaveImageToDB -> Success on saving image data to db!");
            // Send success result to the messenger..
            msgResult = {
                result: "true",
                msgID: msgObj.id
            };
            sendMessageToOne('msgResult', msgResult, msgObj.from);
            return true;
        });
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Save conversation data to the database..
    function saveFileToDB(msgObj) {
        /*
         msgObj format:{
             id: timeID,        // Id for the message box for the sender..
             state: "ND",       // state of message result - ND:Not determined, NS:Not sent
             type: "ONE", "GRP" // Type of message
             contact_id:        // contact id of conversation...
             grpID:             // Group id of conversation, type is "GRP" when defined..
             from: ""           // email of sender,
             to: "",            // email of receiver.. / Concierge
             filePath: ""       // File path that uploaded to the server..
             fileIcon: ""       // File icon type of this file..
         }
         */

        var timestamp = (new Date()).getTime();
        timestamp = timestamp + (new Date()).getTimezoneOffset() * 60000;

        var convData = new ConvDB();

        if(msgObj.type == "ONE") {
            convData.conv_id = msgObj.contact_id;
        }
        else if(msgObj.type == "GRP") {
            convData.conv_id = msgObj.grpID;
        }

        convData.type = msgObj.type;
        convData.timestamp = timestamp;
        convData.from = msgObj.from;
        convData.msg_type = "FILE";
        convData.msg_subtype = msgObj.filePath;
        convData.msg_content = msgObj.fileIcon;
        convData.save(function(err) {
            // Generate result object and send to the messenger..
            var msgResult;
            if(err) {
                console.log("SaveFileToDB -> Error on saving file data to db : " + err);
                // Send feed back to the messenger..
                msgResult = {
                    result: "false",
                    msgID: msgObj.id
                };
                sendMessageToOne('msgResult', msgResult, msgObj.from);
                return false;
            }

            console.log("SaveFileToDB -> Success on saving file data to db!");
            // Send success result to the messenger..
            msgResult = {
                result: "true",
                msgID: msgObj.id
            };
            sendMessageToOne('msgResult', msgResult, msgObj.from);
            return true;
        });
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Save conversation budge data to the database..
    function resetUserMsgBudge(userMail, contact_id, isGrp) {
        UserDB.findOne({'local.email' : userMail}, function(err, gotUser) {
            if (err) {
                console.log("ResetUserMsgBudge -> Error on get user info from db : " + err);
                return;
            }

            if (!gotUser) {
                console.log("ResetUserMsgBudge -> Can't read user info from db : " + gotUser);
                return;
            }

            var contact;
            var updateContact;
            if(isGrp) {
                contact = gotUser.local.grp_contacts.find(function (oneContact) {
                    return oneContact.grpID === contact_id;
                });

                // Update data..
                updateContact = {
                    grpID: contact.grpID,
                    grpName: contact.grpName,
                    msg_budge: 0,
                    grpUsers: contact.grpUsers
                };

                gotUser.local.grp_contacts.splice(gotUser.local.grp_contacts.indexOf(contact), 1);
                gotUser.local.grp_contacts.push(updateContact);


            }
            else {
                contact = gotUser.local.contacts.find(function (oneContact) {
                    return oneContact.contact_id === contact_id;
                });

                if(contact == undefined) {
                    return;
                }

                // Update data..
                updateContact = {
                    state: contact.state,
                    contact_id: contact.contact_id,
                    msg_budge: 0,
                    username: contact.username,
                    email: contact.email,
                    img: contact.img
                };

                gotUser.local.contacts.splice(gotUser.local.contacts.indexOf(contact), 1);
                gotUser.local.contacts.push(updateContact);
            }

            gotUser.save(function(err) {
                if (err) {
                    console.log("ResetUserMsgBudge -> Error on saving budge number : " + gotUser);
                }
            });
        });
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send data to the user that had the revID socket..
    function sendMessageToOne(msg, msgObj, revEMail) {
        // Find person to send message..
        var receiver = connectedUserList.find(function(user) {
            return user.email === revEMail;
        });

        if(receiver != null) {
            var toSocket;
            toSocket = receiver.id;
            io.sockets.connected[toSocket].emit(msg, msgObj);
            console.log(msg + " -> " + revEMail + " : SEND SUCCESS!");
            return true;
        }
        else {
            console.log(msg + " -> " + revEMail + " : SEND FAILED!");
            return false;
        }
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send data to the user that had the revID socket..
    function sendDataToGrpUser(receiver, msgObj, dataType) {
        UserDB.findOne({'local.email' : receiver}, function(err, gotUser) {
            if (err) {
                console.log("LoadMsgBudge -> Error on get user info from db : " + err);
                return;
            }

            if (!gotUser) {
                console.log("LoadMsgBudge -> Can't read user info from db : " + gotUser);
                return;
            }

            var contact = gotUser.local.grp_contacts.find(function(oneContact) {
                return oneContact.grpID === msgObj.grpID;
            });

            var dataObj;

            if(dataType == "TEXT") {
                // Send data to the receiver..
                dataObj = {
                    id: msgObj.id,
                    state: msgObj.state,
                    type: msgObj.type,
                    msg_budge: contact.msg_budge + 1,
                    grpID: msgObj.grpID,
                    from: msgObj.from,
                    to: receiver,
                    msg: msgObj.msg
                };
                sendMessageToOne('msgToOne', dataObj, receiver);
            }
            else if(dataType == "IMG") {
                // Send data to the receiver..
                dataObj = {
                    id: msgObj.id,
                    state: msgObj.state,
                    type: msgObj.type,
                    msg_budge: contact.msg_budge + 1,
                    grpID: msgObj.grpID,
                    from: msgObj.from,
                    to: receiver,
                    img: msgObj.img
                };
                sendMessageToOne('imgToOne', dataObj, receiver);
            }
            else if(dataType == "FILE") {
                // Send data to the receiver..
                dataObj = {
                    id: msgObj.id,
                    state: msgObj.state,
                    type: msgObj.type,
                    msg_budge: contact.msg_budge + 1,
                    grpID: msgObj.grpID,
                    from: msgObj.from,
                    to: receiver,
                    filePath: msgObj.filePath,
                    fileIcon: msgObj.fileIcon
                };
                sendMessageToOne('fileToOne', dataObj, receiver);
            }

            // Update data..
            var updateContact = {
                grpID: contact.grpID,
                grpName: contact.grpName,
                msg_budge: contact.msg_budge + 1,
                grpUsers: contact.grpUsers
            };

            gotUser.local.grp_contacts.splice(gotUser.local.grp_contacts.indexOf(contact), 1);
            gotUser.local.grp_contacts.push(updateContact);

            gotUser.save(function(err) {
                if (err) {
                    console.log("SaveMsgBudge -> Error on saving budge number : " + gotUser);
                    return;
                }
            });
        });
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Convert state of sender side to receiver side..
    function convertStateToAdd(state) {
        var retState = "";
        switch (state) {
            case "ADDED" :
            default:
                retState = "INVITED";
                break;
            case "INVITED" :
                retState = "CONTACTED";
                break;
            case "CONTACTED" :
                retState = "CONTACTED";
                break;
        }

        return retState;
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Convert state of sender side to receiver side..
    function convertStateToRemove(state) {
        var retState = "";
        switch (state) {
            case "ADDED" :
            case "CONTACTED" :
            default:
                retState = "DECLINED";
                break;
            case "INVITED" :
            case "DECLINED":
                retState = "REMOVED";
                break;
        }

        return retState;
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Convert state of sender side to receiver side..
    function getStatusList(contactList) {
        var statusList = [];
        for(var i = 0; i < contactList.length; i++) {
            var connectedUser = connectedUserList.find(function(oneUser) {
                return oneUser.email === contactList[i].email;
            });

            var oneStatus = {};
            if(connectedUser) {
                oneStatus = {
                    email: contactList[i].email,
                    status: "online"
                };
            }
            else {
                oneStatus = {
                    email: contactList[i].email,
                    status: "offline"
                };
            }

            statusList.push(oneStatus);
        }

        return statusList;
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Convert state of sender side to receiver side..
    function sendBotMessage(msgObj) {
        var botMsg = "!!!!";

        var dataObj = {
            type : "BOT",
            from : "CHAT BOT",
            to : msgObj.from,
            msg : ""
        };

        var msgFromUser = msgObj.msg;
        console.log(msgFromUser);
        switch (msgFromUser.sendType) {
            case 'Connect':
                botMsg = "Hello! I'm Doora! What are you looking for today? Doors or windows? Type [CLEAR] to clear the screen, [RESTART] to start from the beginning, or [SKIP] to skip a question.";
                dataObj.msg = botMsg;
                sendMessageToOne('msgToOne', dataObj, dataObj.to);
                break;

            case 'firstChoice':
                if(msgFromUser.msgData.toLowerCase().indexOf('door') > -1){
                    firstChoice = doorsData;
                    botMsg = 'What type of material are you looking for?';
                    dataObj.msg = botMsg;
                    sendMessageToOne('msgToOne', dataObj, dataObj.to);
                }
                else if(msgFromUser.msgData.toLowerCase().indexOf('window') > -1){
                    firstChoice = windowsData;
                    botMsg = 'What dimensions? Type in inches.';
                    dataObj.msg = botMsg;
                    sendMessageToOne('msgToOne', dataObj, dataObj.to);
                }
                else{
                    botMsg = "Sorry! I don't have anything other than doors and windows. Try again !";
                    dataObj.msg = botMsg;
                    sendMessageToOne('msgToOne', dataObj, dataObj.to);
                }
                break;

            case 'filter1':
                if(msgFromUser.msgData.toLowerCase() == 'skip'){
                    botMsg = "What dimensions? Type in inches.";
                    dataObj.msg = botMsg;
                    sendMessageToOne('msgToOne', dataObj, dataObj.to);
                }
                else
                {
                    var reg = new RegExp('.*'+ msgFromUser.msgData +'.*', "i");
                    datas.push({doorMaterial : { $regex : reg}});
                    doorsData.find({ $and: datas }, function(err, data) { //query database
                        if(data.length != 0) { //if results are not empty
                            botMsg = "What dimensions? Type in inches.";
                            dataObj.msg = botMsg;
                            sendMessageToOne('msgToOne', dataObj, dataObj.to);
                        }
                        else { //if results are empty
                            botMsg = "Sorry! I don't have any doors that match those criteria. Please try again.";
                            dataObj.msg = botMsg;
                            sendMessageToOne('msgToOne', dataObj, dataObj.to);
                            datas.splice(-1,1);
                        }
                    });
                }
                break;

            case 'filter2':
                if(msgFromUser.msgData.toLowerCase() == 'skip'){
                    botMsg = "What color?";
                    dataObj.msg = botMsg;
                    sendMessageToOne('msgToOne', dataObj, dataObj.to);
                }
                else{
                    if(firstChoice == doorsData) {
                        var reg = new RegExp('.*'+ msgFromUser.msgData +'.*', "i");
                        datas.push({size : { $regex : reg}});
                    }
                    else if(firstChoice == windowsData){
                        var strSplit = msgFromUser.msgData.split(',');
                        for(var i=0; i < strSplit.length; i++){
                            var reg = new RegExp('.*'+strSplit[i]+'.*', "i");
                            if(i==0)
                                datas.push({frameWidth : { $regex : reg}});
                            else if(i==1)
                                datas.push({frameDepth : { $regex : reg}});
                            else if(i==2)
                                datas.push({frameHeight : { $regex : reg}});
                        }
                    }
                    firstChoice.find({ $and: datas }, function(err, data) { //query database
                        console.log('filter2:' + data.length);
                        if(data.length != 0) { //if results are not empty
                            botMsg = "What color?";
                            dataObj.msg = botMsg;
                            sendMessageToOne('msgToOne', dataObj, dataObj.to);
                        }
                        else { //if results are empty
                            botMsg = "Sorry! I don't have any items that match those criteria. Please try again.";
                            dataObj.msg = botMsg;
                            sendMessageToOne('msgToOne', dataObj, dataObj.to);
                            if(firstChoice == doorsData)
                                datas.splice(-1,1);
                            else
                                datas.splice(-1,3);
                        }
                    });
                }
                break;

            case 'new':
                if(firstChoice == doorsData) {
                    var reg = new RegExp('.*'+msgFromUser.msgData+'.*', "i");
                    datas.push({woodSpecies : { $regex : reg}});
                }
                else if(firstChoice == windowsData) {
                    var orArray = [];
                    var reg = new RegExp('.*'+msgFromUser.msgData+'.*', "i");
                    orArray.push({interiorColor : { $regex : reg}});
                    orArray.push({screenColor : { $regex : reg}});
                    orArray.push({exteriorColor : { $regex : reg}});
                    datas.push({ $or: orArray });
                }
                console.log('length:' + datas.length);
                firstChoice.find({ $and: datas }).limit(5).exec(function(err, data) {
                    //compound mongoose query
                    if(data.length != 0) {
                        datas = data;
                        botMsg = "Here's what I found (click on an image to see its specs): ";
                        dataObj.msg = botMsg;
                        sendMessageToOne('msgToOne', dataObj, dataObj.to);
                        for(var i = 0; i < datas.length; i++) {
                            //datas[i].inventory = datas[i].inventory.split(' ').join('%20');
                            datas[i].inventory = encodeURIComponent(datas[i].inventory);
                        }
                        // io.emit('image', datas);
                    }
                    else {
                        botMsg = "Sorry! I don't have any items that match those criteria. Please try again.";
                        dataObj.msg = botMsg;
                        sendMessageToOne('msgToOne', dataObj, dataObj.to);
                        datas.splice(-1,1);
                    }
                });
                break;
        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Get board list of selected user and send it to the user..
    function sendBoardResult(email) {
        BoardDB.find({
            'collaborators': {
                $elemMatch: {
                    email: email,
                    // username : ""
                }
            }
        },
        function (err, boardList) {
            var dataObj = {};
            if (err) {
                console.log("Search Board -> Error on finding data from DB : " + err);
                dataObj = {
                    result: "failed",
                    reason: "db_err_find_board",
                    data: []
                };
            }
            else {
                console.log("Board List of user : " + boardList);
                dataObj = {
                    result: "success",
                    reason: "",
                    data: boardList
                };
            }

            sendMessageToOne("boardResult", dataObj, email);
        });
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Get board list of selected user and send it to the user..
    function sendBoardThumbImg(url, index, msgObj, filePath) {
        fs.readFile(filePath, function (err, data) {
            var dataObj;
            if (err) {
                console.log("Read board image data -> Error on reading file : " + err);
                 dataObj = {
                    imgID: index,
                    result: "failed",
                    url: url,
                    boardID: msgObj.boardID,
                    reason: "read_file_err",
                    data: []
                };
                sendMessageToOne("boardThumb", dataObj, msgObj.from);
            } else {
                console.log("SUCCESS ON READING IMAGE FILE : " + url);
                dataObj = {
                    imgID: index,
                    result: "success",
                    url: url,
                    boardID: msgObj.boardID,
                    reason: "",
                    data: data.toString('base64')
                };
                sendMessageToOne("boardThumb", dataObj, msgObj.from);
            }
        });
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Get current time stamp..
    function getTimeStamp() {
        var date = new Date();
        return date.getTime();
    }



});


/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


app.set('port', 8000); //set env port variable to 8000

http.listen(process.env.PORT || 8000, function() {
    console.log("Listening on port " + 8000);
});

io.set('authorization', function (handshakeData, accept) {
    if (handshakeData.headers.cookie) {
        handshakeData.cookie = cookieParser(handshakeData.headers.cookie);
        handshakeData.sessionID = handshakeData.cookie['express.sid'];
    }
    else {
        return accept('No cookie transmitted.', false);
    }

    accept(null, true);
});

module.exports = app;
