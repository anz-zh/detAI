//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
  username: String,
  text: String,
  password: String,
});


userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req,res){
  res.render("index"); 
});

app.get("/login", function(req,res){
  res.render("login");
})

app.get("/register", function(req,res){
  res.render("register");
})

app.get("/logout", function(req,res){
  req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
  });
});

app.get("/user/:currentUser", function(req,res){
  if(req.isAuthenticated()){
    res.render("userpage",{username: req.user.username,text: req.user.text});
  }else{
    res.redirect("/login");
  }
}) 

app.get("/forgot",function(req,res){
  res.render("forgot");
})
const { spawn } = require('child_process');


app.post("/user/:currentUser", async function(req, res) {
  if(req.isAuthenticated()) {
    const username = req.params.currentUser;
    const text = req.body.text; 
    try {
      // Execute Python script with a timeout of 10 seconds
      const pythonProcess = spawn('python', ['model.py', text]);

      let dataBuffer = '';

      pythonProcess.stdout.on('data', (data) => {
        dataBuffer += data;
      });

      let percentages = 10;
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script process exited with code ${code}`);
          return res.status(500).json({ message: 'Internal Server Error' });
        }
        try {
          percentages = JSON.parse(dataBuffer);
          console.log(percentages);
          // Update user in the database
          User.findOneAndUpdate(
            { username: username },
            { text: text },
            { new: true }
          ).then(updatedUser => {
            if (updatedUser) {
              console.log(percentages);
              return res.status(200).json({ 
                aiPercentage: 100-percentages,
                humanPercentage: percentages
              });
            } else {
              return res.status(404).json({ message: 'User not found' });
            }
          }).catch(error => {
            console.error('Error updating user:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
          });
        } catch (error) {
          console.error('Error parsing data:', error);
          return res.status(500).json({ message: 'Internal Server Error' });
        }
      });
      // console.log(text,percentages);
      pythonProcess.stderr.on('data', (data) => {
        console.error(`Error executing Python script: ${data}`);
        return res.status(500).json({ message: 'Internal Server Error' });
      });

      // Handle Python script timeout
      pythonProcess.on('error', (error) => {
        console.error('Python script execution error:', error);
        return res.status(500).json({ message: 'Python Script Execution Timeout' });
      });

    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.redirect("/login");
  }
});




app.post("/login", function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });    
  
  req.login(user, function(err){
    if(err){
      console.log(err); 
      res.redirect("/login");
    }else{
      passport.authenticate("local", {
        failureRedirect: "/login",
      })(req, res, function () {
        const currentUser = req.body.username;
        res.redirect("/user/" + currentUser);
      }); 
    }
  });
});



app.post("/login", function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
   });    
   req.login(user, function(err){
    if(err){
      console.log(err); 
      res.redirect("/login");
    }else{
      passport.authenticate("local", {
        failureRedirect: "/login",
      })(req, res, function () {
        const currentUser = req.body.username;
        res.redirect("/user/" + currentUser);
      }); 
    }
   })
})  

app.post("/register", function(req, res){
  let message = "Hello! " + req.body.username + " Enter Your Text";
  console.log(message);
  User.register({username: req.body.username, text: message}, req.body.password,function(err,user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
        passport.authenticate("local")(req,res,function(){
          const currentUser = req.body.username;
          res.redirect("/user/"+currentUser);
        })
    }
} )
})


const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log("Server started on port 3000");
});
 