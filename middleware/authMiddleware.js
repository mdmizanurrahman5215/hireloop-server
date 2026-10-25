
// const createAuthMiddleware = (auth) => {
//   return function authMiddleware({
//     required = true,
//     roles = [],
//   } = {}) {
//     return async function (req, res, next) {
//       try {
//         const authorization = req.get("authorization");

//         // 1. No token provided
//         if (!authorization) {
//           if (required || roles.length > 0) {
//             return res.status(401).json({
//               success: false,
//               message: "Authentication required.",
//             });
//           }

//           return next();
//         }

//         // 2. Validate Bearer format
//         if (!authorization.startsWith("Bearer ")) {
//           return res.status(401).json({
//             success: false,
//             message: "Invalid authorization format.",
//           });
//         }

//         // 3. Verify session through Better Auth
//         const session = await auth.api.getSession({
//           headers: new Headers({
//             authorization,
//           }),
//         });

//         if (!session?.user?.id) {
//           return res.status(401).json({
//             success: false,
//             message: "Invalid or expired token.",
//           });
//         }

//         // 4. Attach verified identity to request
//         req.user = session.user;
//         req.session = session.session;

//         // 5. Validate role
//         if (
//           roles.length > 0 &&
//           !roles.includes(req.user.role)
//         ) {
//           return res.status(403).json({
//             success: false,
//             message: "Insufficient permissions.",
//           });
//         }

//         return next();
//       } catch (error) {
//         console.error("Authentication middleware error:", error);

//         return res.status(401).json({
//           success: false,
//           message: "Authentication failed.",
//         });
//       }
//     };
//   };
// };

// module.exports = { createAuthMiddleware };]

const verifyToken = (sessionsCollection) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      const [type, token] = authHeader.split(" ");
      console.log({token})

      if (type !== "Bearer" || !token) {
        return res.status(401).json({
          success: false,
          message: "Invalid authorization format",
        });
      }

      const session = await sessionsCollection.findOne({
        token,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      req.session = session;
      req.userId = session.userId;

      next();
    } catch (error) {
      console.error("Token verification error:", error);

      return res.status(500).json({
        success: false,
        message: "Token verification failed",
      });
    }
  };
};

module.exports = { verifyToken };

