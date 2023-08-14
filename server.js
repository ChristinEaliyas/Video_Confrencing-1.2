const express = require('express');
const { socket } = require('socket.io');
const app = express();
const { pool } = require("./dbConfig");
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
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
app.get('/create-room', checkNotAuthenticated,(req, res) => {
    let newRoomId = uuidV4()
    let errors = [];
    pool.query(
        `INSERT INTO rooms (roomid)
        VALUES ($1)
        RETURNING id`,
        [newRoomId],
        (err, results) => {
            if (err){
                if(err.code === '23505'){
                    errors.push({ message: "This Room is in a Meeting"}) // Display Message is not Done
                    res.render("register", { errors })
                }else{
                    throw err;
                }
            }
        }
    );
    res.redirect(`/${newRoomId}`)
})

app.post("/join-room", async (req, res) => {
    let { roomId } = req.body;
    let errors = [];
    checkRoomExists(roomId)
        .then(roomExist => {
            if (roomExist) {
                res.redirect(`/${roomId}`);
            } else {
                errors.push({ message: "Enter a Valid Room Id" });
                res.redirect("/user/dashboard");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Handle the error properly, e.g., render an error page
        });
});

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

async function checkRoomExists(roomId) {
    const query = {
      text: 'SELECT * FROM rooms WHERE roomid = $1',
      values: [roomId],
    };

    try {
      const result = await pool.query(query);
      return result.rows.length > 0; 
    } catch (error) {
      console.error('Error querying database:', error);
      return false; 
    }
  }

// Copy in Temp.js

io.on("connection", (socket) => {
    socket.on('join-room', (roomId, userId) => {
        console.log(roomId, userId)
        socket.join(roomId)
        socket.to(roomId).emit('user-connected', userId)
    })
})


server.listen(3000)