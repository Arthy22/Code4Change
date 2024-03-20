if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const passport = require("passport");
const initializePassport = require("./passport-config");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const collection = require("./config.js");

initializePassport(
  passport,
  (email) => users.find((user) => user.email === email),
  (id) => users.find((user) => user.id === id)
);

const users = [];

app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));

app.post(
  "/login",
  checkNotAuthenticated,
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.post("/register", checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });
    console.log(users);
    res.redirect("/login");
  } catch (e) {
    console.log(e);
    res.redirect("/register");
  }
});

app.get("/", checkAuthenticated, (req, res) => {
  res.render("index.ejs", { name: req.user.name });
});

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "sankararthy99@gmail.com",
    pass: "boyk onth begp zdjb",
  },
});

function generateGoogleMeetLink() {
  const meetLink = `https://meet.google.com/${generateRandomString()}`;
  return meetLink;
}

function generateRandomString(length = 10) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomString = "";
  for (let i = 0; i < length; i++) {
    randomString += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return randomString;
}

app.post("/therapy", async (req, res) => {
  const { name, date, slot } = req.body;

  if (!name || !date || !slot) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const existingEntry = await collection.TherapistModel.findOne({
      name,
      date,
      slot,
    });

    if (existingEntry) {
      console.log(
        `Therapist ${name} is not available on ${date} at slot ${slot}. Please choose another slot.`
      );
      return res.status(409).json({ message: "Slot unavailable" });
    } else {
      const newTherapist = new collection.TherapistModel({
        name,
        date,
        slot,
        availability: false,
        email_id: "arthy.2022@vitstudent.ac.in",
      });

      await newTherapist.save();

      const meetLink = generateGoogleMeetLink();

      const therapistEmail = await collection.TherapistModel.findOne({
        name,
        date,
        slot,
      }).select("email_id");

      const mailOptions = {
        from: "sankararthy99@gmail.com",
        to: therapistEmail,
        subject: "Appointment Booking Confirmation",
        text: `Dear Therapist,

Your appointment has been successfully booked for ${date} at slot ${slot}.
Please join the Google Meet using the following link:
${meetLink}

Best regards,
Your App`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });

      console.log(
        `Therapist ${name} is available on ${date} at slot ${slot}. Booking confirmed!`
      );
      return res.status(201).json({ message: "Booking successful!" });
    }
  } catch (error) {
    console.error("Error booking therapist:", error);
    return res
      .status(500)
      .json({ message: error.message || "Error booking therapist" });
  }
});
app.get("/therapy", (req, res) => {
  res.render("therapy.ejs");
});

app.get("/priscription", checkAuthenticated, (req, res) => {
  res.render("priscription.ejs", { name: req.user.name });
});
app.get("/habit", checkAuthenticated, (req, res) => {
  res.render("habit.ejs", { name: req.user.name });
});
app.get("/assesments", checkAuthenticated, (req, res) => {
  res.render("assesment.ejs", { name: req.user.name });
});
app.get("/login", checkNotAuthenticated, (req, res) => {
  res.render("login.ejs");
});

app.get("/register", checkNotAuthenticated, (req, res) => {
  res.render("register.ejs");
});

app.delete("/logout", (req, res) => {
  req.logout(req.user, (err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  next();
}

app.listen(3000);
