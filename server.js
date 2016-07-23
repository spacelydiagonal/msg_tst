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

app.use(express.static(__dirname + '/public'));
app.use(flash());
app.use(cookieParser('proquerio'));
app.use(session({ cookie: { maxAge: 60000 }}));
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

//////////////////////////////////////////////////////////////////
// Added code..
//////////////////////////////////////////////////////////////////
// Initialize..
var CONN_STRING = "mongodb://localhost:27017/proquerio";
// var CONN_STRING = "mongodb://dev:dev@ds049854.mlab.com:49854/proquerio";

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
// var ConvDB = require('./schema/convSchema.js');
var sUser;

String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

function loggedIn(req) {
    return typeof req.user == "undefined";
}


/////////////////////////////////////////////////////////////////

app.get("/", function(req, res) {
    res.render('login.jade', {
        message: req.flash('loginMessage')
    });
});

app.get('/main', function(req, res) {
    if(loggedIn(req)) {
        res.redirect("/");
    }
    else {
        res.render("main.jade", {
            userInfo: req.user.local
        });
        var sess = req.session;
        sess.email = req.user.local.email;
        sess.userinfo = req.user.local;
    }
});

// Load signup..
app.get("/signup", function(req, res) {
    res.render('signup.jade', {
        message: req.flash('signupMessage')
    });
});

// Success in signup, save user data, go to main page..
app.get("/signupSuccess", function(req, res) {
    var newUser = new UserDB();
    newUser.local.email    = sUser.local.email;
    newUser.local.password = newUser.generateHash(sUser.local.password);
    newUser.local.username = sUser.local.username;
    newUser.local.contacts = [{name: "Doora"}];

    newUser.save(function(err) {
        if (err) {
            throw err;
            return;
        }

        var userData = {
            username : sUser.local.username,
            email : sUser.local.email
        }
        // Render main chat view..
        res.render('main.jade', {
            userInfo: userData
        });
    });
});

app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/main',
    failureRedirect : '/',
    failureFlash : true,
    successFlash: true
}));

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

// app.post('/signup', passport.authenticate('local-signup', {
//         failureRedirect: '/signup',
//         successRedirect: '/main',
//         failureFlash: true,
//         successFlash: true
//     })
// );

//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////
// Socket IO
//////////////////////////////////////////////////////////////////
var userList = [];

io.on('connection', function(socket) { //on first connection

    console.log('a user connected!');

    var datas=[], firstChoice;

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Receive new user, add userlist, and let others know, from client.js : socket.emit("login");
    socket.on('login', function(user){
        /*
        user = {
            name : user name,
            email : user email,
            img : user image
        }
        */

        user.id = socket.id;
        userList.push(user);

        // Send the userlist to all client : userList..
        io.emit('userList', userList);

        // Get user information from database..
        UserDB.findOne({ 'local.email' :  user.email }, function(err, gotuser) {
            if (err) {
                console.log("Error on get user info from db : " + err);
                return;
            }

            if (!gotuser) {
                console.log("Can't read user info from db : " + gotuser);
                return;
            }

            var userInfo = {
                id : user.id,
                username : gotuser.local.username,
                email : gotuser.local.email,
                password : gotuser.local.password,
                contacts : gotuser.local.contacts,
                img : user.img
            }

            console.log("LOGIN USER ------", userInfo);
            // Send the client information to client..
            socket.emit('userInfo', userInfo);
        });

        // Send all users the feature of new user login..
        socket.broadcast.emit('sysInfo', user.name + " connected.");
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // When log out, delete user from user list and send new user list to the clients..
    socket.on('disconnect',function() {
        console.log("a user disconnected!");
        if (userList == null) {
            return;
        }

        var user = userList.find(function(item) {
            return item.id === socket.id;
        });

        // var user = find(userList,{id:socket.id});
        if(user){
            userList.splice(userList.indexOf(user), 1);

            //send the userlist to all client
            io.emit('userList', userList);

            //send login info to all.
            socket.broadcast.emit('sysInfo', user.name + " disconnected.");
        }
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
             from : {
                 username : username,
                 email : email,
                 password : password,
                 contacts : contacts
                 id : socket id
             }
             img : e.target.result,
             to : receiver.id,
         }
        */

        var receiver = userList.find(function(item) {
            return item.id === msgObj.to;
        });

        if(receiver != null) {
            var toSocket;
            toSocket = receiver.id;
            io.sockets.connected[toSocket].emit('imgToOne', msgObj);
            console.log("Send image!");
        }
        else {
            console.log("Failed sending image!");
        }
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Send image from one user to another..
    socket.on('msgToOne',function(msgObj){
        /*
         msgObj format:{
             from:{
                 id : user.id,
                 username : name of user logged in,
                 email : ,
                 password : ,
                 contacts : contacts of this user,
                 img : user.img
             },
             to:"",  //  socket id
             msg:""
         }
        */

        // Find person to send message..
        var receiver = userList.find(function(item) {
            return item.id === msgObj.to;
        });

        if(receiver != null) {
            var toSocket;
            toSocket = receiver.id;
            io.sockets.connected[toSocket].emit('msgToOne', msgObj);
        }
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
        var transport = nodemailer.createTransport('smtps://timkern0702%40gmail.com:xlazjs0702@smtp.gmail.com/?pool=true');
        var htmlLink = '<h1>Invite you to the chat!</h1><br>' + inviteInfo.from + ' sent you a invite to the chat!<br>'
                        + '<p><a href="http://localhost:8000">Visit page</a></p>';
        var mailOptions = {
            // from: inviteInfo.from,
            // to: inviteInfo.to,
            from: 'timkern0702@gmail.com',
            // to: inviteInfo.to,
            to: 'devandparse14@outlook.com',
        	subject: 'Invite to the chat!!',
            // text: inviteInfo.from + ' sent you a invite to the chat!!'
        	html : htmlLink
        };

        transport.sendMail(mailOptions, function(error, info){
            var receiver = userList.find(function(item) {
                return item.email === inviteInfo.from;
            });

            var toSocket = io.sockets.connected[receiver.id];

            if (error){
                toSocket.emit('inviteErr', 'ERR : ' + error.message);
        		console.log(error);
        	} else {
                toSocket.emit('inviteResponse', 'Response : ' + info.response);
        		console.log("Message sent : " + info.response);
        	}
            transport.close();
        });
    });

});


//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

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

module.exports = app;
