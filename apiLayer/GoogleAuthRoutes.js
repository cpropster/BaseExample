const authRouter = require("express").Router();
const qs = require("querystring");
const Axios = require("axios");
const uuid = require("uuid");
const {
  createUser,
  readUsers,
  getUser,
  updateUser,
  deleteUser,
} = require("../dataLayer/modelsIndex");

const redirect_uri =
  process.env.REDIRECT_URI || "http://localhost:3000/api/auth/callback";
const emailScope = "https://www.googleapis.com/auth/userinfo.email";
const userScope = "https://www.googleapis.com/auth/userinfo.profile";

authRouter.get("/callback", async (req, res, next) => {
  try {
    const { data } = await Axios.post(
      "https://www.googleapis.com/oauth2/v4/token",
      {
        code: req.query.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri,
      }
    );
    const { data: _user } = await Axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      }
    );

    const values = {
      googleId: _user.id,
      email: _user.email,
      firstName: _user.given_name,
      lastName: _user.family_name,
      password: uuid.v4(),
    };

    if (_user.picture) {
      values.imageURL = _user.picture;
    }

    //may have to change values.email to values.googleId in case someone signs up for simple with gmail
    let user = await getUser({ email: values.email });

    if (!user) {
      user = await createUser({
        userName: "",
        teacher: false,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        googleId: values.googleId,
        imageURL: values.imageURL,
      });
    }

    if (!user.userName) {
      res.send(
        `<script>
        window.localStorage.setItem('token', '${data.id_token}');
        window.localStorage.setItem('email', '${values.email}');
        window.location = '/#/createusername';
        </script>`
      );
    } else {
      res.send(
        `<script>
      window.localStorage.setItem('token', '${data.id_token}');
      window.localStorage.setItem('email', '${values.email}');
      window.location = '/#/chat';
      </script>`
      );
    }
  } catch (error) {
    next(error);
  }
});

authRouter.get("/", (req, res) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${qs.stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    response_type: "code",
    scope: `${emailScope} ${userScope}`,
    redirect_uri,
  })}`;

  res.redirect(url);
});

module.exports = authRouter;
