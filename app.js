const express = require("express")
const app = express()
const mongoose = require("mongoose")
const session = require("express-session")
const User = require('./models/User')
const Post = require('./models/Post')

require("dotenv").config();

const mongoURL = process.env.MONGO_URL;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));
app.use(express.urlencoded({ extended: false }))

mongoose.connect(mongoURL, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    dbName: "users"
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB connection error:', err))

app.get('/', async (req, res) =>{
    const posts = await Post.find().sort({ createdAt: -1 });

    if(typeof req.session.email != 'undefined'){
        res.render('home', {user: req.session.name, posts : posts})
    } else {
        res.render('login')
    }
})

app.set("view engine", "ejs")

app.get("/login", (req, res) => res.render("login"))

app.get("/register", (req, res) => res.render("register"))

app.get("/new", (req, res) => res.render("new"))

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    let msg = "";

    if (!name || !email || !password) {
        msg = "Please fill in all the fields!";
        return res.render("register", { msg })
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            msg = "Email already used!";
            return res.render("register", { msg });
        }

        const newUser = new User({ name, email, password });
        await newUser.save();

        msg = "Account created! Please login";
        return res.render("login", { msg });

    } catch (err) {
        console.error("Error during registration", err);
        msg = "An error occured";
        return res.render("register", { msg });
    }

});

app.post('/login', async (req, res) => {
    const { email, password } = req.body

    try {
        const user = await User.findOne({ email })
        if (!user) {
            return res.render('login', { msg: 'User not found' })
        }

        if (user.password === password) {
            req.session.email = email
            req.session.name = user.name
            return res.redirect('/')
        } else {
            return res.render('login', { msg: 'Wrong Password' })
        }
    } catch (err) {
        console.error(err)
        return res.render("login", { msg: 'Login Error' })
    }
})

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        res.render('login', {msg: 'You have logged out'})
    })
})

app.post('/save', async (req, res) => {
    try{
        const post = new Post({
            title: req.body.title,
            description: req.body.description,
            author: req.session.name
        });

        await post.save();
        res.redirect('/');
    } catch(err){
        console.error('Error saving post', err);
        res.render('new', {msg: 'Failed to save post'});
    }
});

app.get('/delete/:id', async (req, res) => {
    try{
        await Post.deleteOne({_id: req.params.id});
        res.redirect('/');
    }catch(err){
        console.error('Error deleting post:',err);
        res.render('home', {msg: 'Failed to delete post', user: req.session.name, posts: []});
    }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

