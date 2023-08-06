const express = require('express');
const { Socket } = require('socket.io');
const app = express();
const { pool } = require("./dbConfig");
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const exp = require('constants');
const bcrypt = require("bcrypt");
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');

const initializePassport = require('./passportConfig');
initializePassport(passport);

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))
app.use(session({
    secret: 'kmvsbjdbam',

    resave: false,

    saveUninitialized: false
}));
app.use(flash()); 
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    res.render('home')
})

app.get('/user/login', (req, res) => {
    res.render("login")
})
app.get('/user/register', (req, res) => {
    res.render("register")
})
app.get('/user/dashboard', checkNotAuthenticated, (req, res) => {
    res.render("dashboard", {user: req.user.name})
})
app.get('/user/logout', (req, res) => {
    req.logOut();
    res.redirect("/")
})
app.get('/join-room', checkNotAuthenticated,(req, res) => {
    res.redirect(`/${uuidV4()}`)
})

app.get('/:room', checkNotAuthenticated, (req, res) => {
    res.render('room', { roomId: req.params.room})
})

// ----- api -----
app.get('/api/user/id', (req, res) => {
    const userId = req.user.id;
    res.json(userId)
})

app.post('/user/register', async (req, res) => {
    let { name, email, password1, password2} = req.body;
    let errors = [];

    if(password1.length < 8) {
        errors.push({ message: "Password should be at least 8 characters"});
    }
    if(password1 != password2){
        errors.push({ message: "Passwords Does not match"});
    }
    if(errors.length > 0){
        res.render("register", { errors });
    }else{
        let hashedPassword =  await bcrypt.hash(password1, 12);
        
        /*pool.query(
            `SELECT * FROM users
            WHERE email = $1`, 
            [email], 
            (err, result) => {
                if (err) {
                    throw err;
                }
                if(result.rows.length > 0) {
                    errors.push({message: "Email already Registered"})
                    res.render("register", { errors });
                }
            }
        );*/

        pool.query(
            `INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, password`,
            [name, email, hashedPassword],
            (err, results) => {
                if (err){
                    if(err.code === '23505'){
                        errors.push({ message: "The Email is Already Registered"})
                        res.render("register", { errors })
                    }
                }else{
                console.log(results.rows);
                res.redirect('/')
                }
            }
        )
    }
    
});

app.post("/user/login",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/user/login",
        failureFlash: true
    })
);

function checkAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        return res.redirect("/user/dashboard");
    }
    next();
}
function checkNotAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        return next();   
    }
    return res.redirect("/user/login");
}


io.on('connection', Socket => {
    Socket.on('join-room', (roomId, userId) => {
        console.log(roomId, userId)
        Socket.join(roomId)
        Socket.to(roomId).emit('user-connected', userId)

        Socket.on('disconnect', () =>{
            Socket.to(roomId).emit('user-disconnected', userId)
        })
    })
})

server.listen(3000)