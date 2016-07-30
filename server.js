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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    console.log('connection error', err);
});
db.once('open', function () {
    console.log('connected.');
});

var UserDB = require('./schema/userSchema.js');
var GrpDB = require('./schema/grpSchema.js');
// var ConvDB = require('./schema/convSchema.js');
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
    console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    console.log(req.user);
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
    // if(loggedIn(req)) {
    //     // Render main chat view..
    //     res.render('login.jade');
    // }
    // else {
        var newUser = new UserDB();
        newUser.local.email = sUser.local.email;
        newUser.local.password = newUser.generateHash(sUser.local.password);
        newUser.local.username = sUser.local.username;
        newUser.local.contacts = [];
        newUser.local.grp_contacts = [];
        newUser.local.img = "/images/man.png";

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
    // }
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


// app.post('/signup', passport.authenticate('local-signup', {
//         failureRedirect: '/signup',
//         successRedirect: '/main',
//         failureFlash: true,
//         successFlash: true
//     })
// );

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

    console.log('a user connected!');

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
        });

        // Send all users the feature of new user login..
        socket.broadcast.emit('sysInfo', user.username + " connected.");
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // When log out, delete user from user list and send new user list to the clients..
    socket.on('disconnect',function() {
        console.log("a user disconnected!");
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

            console.log("REFRESH USER ----------");
            console.log(userInfo);

            // Send the client information to client..
            socket.emit('userInfo', userInfo);
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
    socket.on('imgToOne',function(msgObj){
        /*
         format:{
             type: "BOT" / "ONE" / "GRP",
             from : sender.email,
             to : receiver.email,
             img : e.target.result,
         }
        */

        sendMessageToOne('imgToOne', msgObj, msgObj.to);
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to another..
    socket.on('msgToOne',function(msgObj){
        /*
         msgObj format:{
             type: "BOT" / "ONE" / "GRP",
             from: ""  // email of sender,
             to: "",    // email of receiver..
             msg: ""
         }
        */

        sendMessageToOne('msgToOne', msgObj, msgObj.to);
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
        var transport = nodemailer.createTransport('smtps://proquerio%40gmail.com:d1YoT6M5Aecy@smtp.gmail.com/?pool=true');
        var htmlLink = '<h1>Invite you to the chat!</h1><br>' + inviteInfo.from + ' sent you a invite to the chat!<br>'
                        + '<p><a href="http://localhost:8000">Visit page</a></p>';
        var mailOptions = {
            // from: inviteInfo.from,
            // to: inviteInfo.to,
            from: 'proquerio@gmail.com',
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
                    toSocket.emit('inviteErr', 'ERR : ' + error.message);
                    console.log(error);
                } else {
                    toSocket.emit('inviteResponse', 'Response : ' + info.response);
                    console.log("Message sent : " + info.response);
                }
            }
            transport.close();
        });
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
                    toSocket.emit('noticeErr', 'ERR : ' + error.message);
                    console.log(error);
                } else {
                    toSocket.emit('noticeResponse', 'Response : ' + info.response);
                    console.log("Message sent : " + info.response);
                }
            }
            transport.close();
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

            console.log("SEARCH RESULT --------");
            console.log(searchList);
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
                    console.log("AddToContact(sender) -> Can't read user info from db : " + msgObj.from.email);
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
                    console.log("AddToContact(receiver) -> Can't read user info from db : " + msgObj.from.email);
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
            grpUsers: [
                oneUser: {
                    username: user name,
                    email: email
                    img : img
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
            console.log(msg + " : SEND SUCCESS!");
        }
        else {
            console.log(msg + " : SEND FAILED!");
        }
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
