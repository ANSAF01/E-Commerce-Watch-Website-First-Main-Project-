const User = require("../models/User");

module.exports = async (req, res, next) => {
  if (req.session && req.session.user) {
    try {
      const user = await User.findById(req.session.user._id);

      if (!user || user.isBlocked) {
        req.session.destroy((err) => {
          if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({
              success: false,
              message: "Your account has been blocked. Please contact support.",
              accountBlocked: true,
            });
          }
          return res.redirect("/auth/login?blocked=true");
        });
        return;
      }

      return next();
    } catch (err) {
      return next(err);
    }
  }

  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(401).json({
      success: false,
      message: "Please login to continue",
      requiresLogin: true,
    });
  }

  return res.redirect("/auth/login");
};
