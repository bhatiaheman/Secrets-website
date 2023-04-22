//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyparser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalmongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({extended: true}));

app.use(session({
    secret: "our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());




mongoose.connect('mongodb+srv://<username></username>:<password></password>@cluster0.vekvkum.mongodb.net/?retryWrites=true&w=majority/userDB',
{useUnifiedTopology: true , 
 useNewUrlParser: true,
 writeConcern: {
    w: 'majority'
  }
});

const userschema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userschema.plugin(passportLocalmongoose);
userschema.plugin(findOrCreate);

const User = new mongoose.model("User", userschema)

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  })

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/secrets',
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/' , function(req,res){
    res.render('home');
});

app.get('/auth/google', 
    passport.authenticate('google' , {scope: ["profile"]}));

    app.get('/auth/google/secrets', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });    


app.get('/login' , function(req,res){
    res.render('login');
});

app.get('/register' , function(req,res){
    res.render('register');
});

app.get('/secrets' , function(req,res){
    User.find({'secrets': {$ne: null}})
    .then(foundUser => {
        if(foundUser) {
            res.render('secrets' , {usersWithSecrets: foundUser})
        }
    })
    .catch(err => {
        console.log(err);
    });

});

app.get('/submit' , function(req,res){
    if(req.isAuthenticated()) {
        res.render('submit');
    }else{
        res.redirect('/login');
    }
});

app.post('/submit', function(req,res){
    const submittedSecret = req.body.secret;

    User.findById(req.user.id)
        .then(foundUser => {
            if(foundUser){
                foundUser.secret =submittedSecret;
                return foundUser.save();
            }
        })
        .then(() =>{
            res.redirect('secrets');
        })
        .catch(err=>{
            console.log(err);
        })
});

app.get('/logout' , function(req,res){
    req.logout(function(err) {
        if (err) {
            console.log(err);
        }else {
        res.redirect('/');
        }
     });

});

app.post('/register', function(req,res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err) {
            console.log(err);
        }else{
            passport.authenticate("local")(req, res , function(){
                res.redirect('/secrets');
            })
        }
    });
   
});

app.post('/login', function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
            res.render('/login');
        }else{
            passport.authenticate('local')(req, res, function(){
                res.redirect('/secrets');
            });
        }
    });
      
});


app.listen(3000, function(){
    console.log('server started')
});