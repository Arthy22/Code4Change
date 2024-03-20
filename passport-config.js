const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const UserModel = require("./config.js").UserModel;

function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUsers = async (email, password, done) => {
    try {
      const user = await getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: "No user found with that email" });
      }

      if (await bcrypt.compare(password, user.password)) {
        return done(null, user);
      } else {
        return done(null, false, { message: "Password Incorrect" });
      }
    } catch (error) {
      console.error("Error authenticating user:", error);
      return done(error);
    }
  };

  passport.use(
    new LocalStrategy({ usernameField: "email" }, authenticateUsers)
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id));
  });
}

module.exports = initialize;
