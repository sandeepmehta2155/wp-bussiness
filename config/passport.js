const { ExtractJwt, Strategy } = require("passport-jwt");
const config = require("./config.js");

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  passReqToCallback: true,
};
const jwtVerify = async (_req, payload, done) => {
  try {
    const user = await prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEditable: true,
        roles: {
          select: {
            name: true,
            id: true,
          },
        },
      },

      where: { id: payload.sub },
    });

    if (!user) {
      return done(null, false);
    }
    done(null, { ...user, role: user.roles?.name ?? user.role });
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new Strategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};
