/**
 * Created by abhinavr on 5/30/16.
 */
var LocalStrategy = require('passport-local').Strategy;
var User = require("../schema/userSchema");
var flash = require('connect-flash');
var passport = require('passport');

module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });


    passport.use('local-signup', new LocalStrategy({
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true
        },
        function(req, email, password, done) {
            process.nextTick(function() {
                User.findOne({ 'local.email' :  email }, function(err, user) {
                    if (err)
                        return done(err);
                    if (user) {
                        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                    }
                    else {
                        var newUser = new User();
                        newUser.local.email    = email;
                        newUser.local.password = newUser.generateHash(password);
                        // newUser.local.name = req.uField;
                        newUser.local.contacts = [{name: "Doora"}];
                        return done(null, newUser);
                        // var newUser = new User();
                        // newUser.local.email    = email;
                        // newUser.local.password = newUser.generateHash(password);
                        // newUser.local.name = req.uField;
                        // newUser.local.contacts = [{name: "Doora"}];
                        // newUser.save(function(err) {
                        //     if (err)
                        //         throw err;
                        //     return done(null, newUser);
                        // });
                    }

                });

            });

        }));
    };

    passport.use('local-login', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, email, password, done) {
        User.findOne({ 'local.email' :  email }, function(err, user) {
            if (err) return done(err);
            if (!user) return done(null, false, req.flash('loginMessage', 'No user found.'));
            if (!user.validPassword(password)) return done(null, false, req.flash('loginMessage', 'Wrong password.'));
            // Session Create...
            // Seseion user data save..
            return done(null, user);
        });

    }
));
