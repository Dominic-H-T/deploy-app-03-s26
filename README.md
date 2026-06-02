# Transactions 3 API

## Node + Express + MongoDB + Authentication + Models + Controllers + Routes + Heroku

This guide creates a third version of the Transactions API.

The previous Transactions app introduced a back-end API for credit card transactions. This version keeps the same transaction idea, but adds **authentication**.

In this project, students will build a back-end application using:

- Node.js
- Express
- MongoDB
- Mongoose
- Models
- Controllers
- Routes
- Middleware
- Password hashing with `bcryptjs`
- Authentication with JSON Web Tokens using `jsonwebtoken`
- Local MongoDB using Docker
- MongoDB Atlas for production
- Heroku for deployment
- Postman for testing

The app will support:

- User self-registration
- Login with username and password
- Passwords stored as hashes, not plain text
- Password rule: every password must include at least one number
- A seeded admin user:

```txt
username: admin
password: secret321
```

- A protected endpoint to change the logged-in user's password
- Protected transaction routes that require a valid token

---

# Project Goal

Create a protected Transactions API.

Users must log in before they can create or view transactions.

The transaction records are still append-only:

- Transactions can be created.
- Transactions can be read.
- Transactions are not edited.
- Transactions are not deleted.
- Corrections are made by adding amendment transactions.

This is a good teaching example because it introduces an important professional back-end pattern:

```txt
client -> route -> middleware -> controller -> model -> database
```

---

# Big Picture Architecture

The project will be organized like this:

```txt
transactions3-api/
├── .devcontainer/
│   └── devcontainer.json
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── transactionController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Transaction.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── transactionRoutes.js
│   ├── seed/
│   │   └── seedUsers.js
│   └── server.js
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

# API Endpoints

## Public routes

These routes do not require a token.

```txt
GET /
POST /api/auth/register
POST /api/auth/login
```

## Protected routes

These routes require a valid JWT token in the `Authorization` header.

```txt
GET /api/auth/me
GET /api/auth/users
PATCH /api/auth/change-password
POST /api/transactions
GET /api/transactions
GET /api/transactions/:id
```

The token must be sent like this:

```txt
Authorization: Bearer YOUR_TOKEN_HERE
```

---

# Data Models

## User

A user will look like this in MongoDB:

```json
{
  "_id": "mongodb-generated-id",
  "username": "admin",
  "fullName": "Admin User",
  "passwordHash": "hashed-password-value",
  "role": "admin",
  "createdAt": "2026-05-17T00:00:00.000Z",
  "updatedAt": "2026-05-17T00:00:00.000Z"
}
```

The plain password is never stored.

Only the password hash is stored.

## Transaction

A transaction will look like this:

```json
{
  "_id": "mongodb-generated-id",
  "creditCardNickname": "Costco Visa",
  "cardType": "Visa",
  "date": "2026-05-12T00:00:00.000Z",
  "amount": 42.75,
  "amendment": false,
  "comment": "Gas",
  "createdBy": "mongodb-user-id",
  "createdAt": "2026-05-17T00:00:00.000Z",
  "updatedAt": "2026-05-17T00:00:00.000Z"
}
```

Each transaction records which user created it.

---

# Phase 0 — Requirements

You should already have:

- Visual Studio Code
- Docker Desktop
- Git
- Node.js knowledge from previous activities
- Postman
- A Heroku account
- A MongoDB Atlas account

For local development, MongoDB will run inside Docker.

For Heroku deployment, MongoDB will run in MongoDB Atlas.

---

# Phase 1 — Create the Project Folder

Create a new folder:

```bash
mkdir transactions3-api
cd transactions3-api
```

Initialize Git:

```bash
git init
```

Initialize Node:

```bash
npm init -y
```

---

# Phase 2 — Install Dependencies

Install the application dependencies:

```bash
npm install express mongoose dotenv cors bcryptjs jsonwebtoken
```

Install the development dependency:

```bash
npm install --save-dev nodemon
```

Update `package.json` so it looks like this:

```json
{
  "name": "transactions3-api",
  "version": "1.0.0",
  "description": "Transactions API with authentication, MongoDB, and Heroku deployment",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed:users": "node src/seed/seedUsers.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

Your exact version numbers may be newer. That is fine.

---

# Phase 3 — Create the Folder Structure

Create the project folders:

```bash
mkdir -p src/config
mkdir -p src/controllers
mkdir -p src/middleware
mkdir -p src/models
mkdir -p src/routes
mkdir -p src/seed
mkdir -p .devcontainer
```

Create the main files:

```bash
touch src/server.js
touch src/config/db.js
touch src/models/User.js
touch src/models/Transaction.js
touch src/controllers/authController.js
touch src/controllers/transactionController.js
touch src/middleware/authMiddleware.js
touch src/routes/authRoutes.js
touch src/routes/transactionRoutes.js
touch src/seed/seedUsers.js
touch .env.example
touch .gitignore
touch Dockerfile
touch docker-compose.yml
touch .devcontainer/devcontainer.json
touch README.md
```

---

# Phase 4 — Add Environment Variables

Create `.env.example`:

```env
PORT=3000
MONGODB_URI=mongodb://db:27017/transactions3
JWT_SECRET=replace_this_with_a_long_random_secret
JWT_EXPIRES_IN=1d
```

Create a real `.env` file for local development:

```bash
cp .env.example .env
```

The `.env` file should not be committed to GitHub.

Create `.gitignore`:

```gitignore
node_modules
.env
.DS_Store
```

Important:

```txt
Never commit JWT_SECRET to GitHub.
Never commit your MongoDB Atlas connection string to GitHub.
Never store plain text passwords in the database.
```

---

# Phase 5 — Docker Development Environment

Create `Dockerfile`:

```Dockerfile
FROM node:20-bookworm

WORKDIR /app

RUN apt-get update \
    && apt-get install -y curl gnupg \
    && curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg \
    && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" > /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && apt-get install -y mongodb-mongosh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

Create `docker-compose.yml`:

```yaml
services:
  api:
    build: .
    container_name: transactions3_api
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: mongo:7
    container_name: transactions3_db
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

Create `.devcontainer/devcontainer.json`:

```json
{
  "name": "Transactions 3 API",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "api",
  "workspaceFolder": "/app",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-json",
        "humao.rest-client",
        "mongodb.mongodb-vscode"
      ]
    }
  }
}
```

Open the folder in VS Code and choose:

```txt
Reopen in Container
```

---

# Phase 6 — Database Connection

Create `src/config/db.js`:

```js
const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from environment variables");
  }

  await mongoose.connect(mongoUri);

  console.log("Connected to MongoDB");
}

module.exports = connectDB;
```

This file keeps the database connection separate from `server.js`.

---

# Phase 7 — Create the User Model

Create `src/models/User.js`:

```js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
```

Important teaching point:

```txt
The model describes the shape of the data in MongoDB.
The user has passwordHash, not password.
```

---

# Phase 8 — Create the Transaction Model

Create `src/models/Transaction.js`:

```js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    creditCardNickname: {
      type: String,
      required: true,
      trim: true
    },
    cardType: {
      type: String,
      required: true,
      enum: ["Visa", "Master", "Amex", "Discover", "Other"]
    },
    date: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    amendment: {
      type: Boolean,
      default: false
    },
    comment: {
      type: String,
      trim: true,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
```

The `createdBy` field connects each transaction to the logged-in user.

---

# Phase 9 — Authentication Helper Concepts

This app uses two important authentication tools.

## bcryptjs

`bcryptjs` hashes passwords.

A hash is a one-way transformation.

That means the app can check a password, but it does not need to store the original password.

## jsonwebtoken

`jsonwebtoken` creates and verifies tokens.

After login, the server gives the client a token.

The client sends the token on protected requests.

```txt
Authorization: Bearer token-goes-here
```

---

# Phase 10 — Create the Authentication Controller

Create `src/controllers/authController.js`:

```js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function passwordHasNumber(password) {
  return /\d/.test(password);
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
}

async function register(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters long" });
    }

    if (!passwordHasNumber(password)) {
      return res.status(400).json({ message: "password must include at least one number" });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({ message: "username is already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      passwordHash,
      role: "user"
    });

    const token = createToken(user);

    return res.status(201).json({
      message: "user registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "invalid username or password" });
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsCorrect) {
      return res.status(401).json({ message: "invalid username or password" });
    }

    const token = createToken(user);

    return res.json({
      message: "login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getMe(req, res) {
  return res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    }
  });
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "new password must be at least 6 characters long" });
    }

    if (!passwordHasNumber(newPassword)) {
      return res.status(400).json({ message: "new password must include at least one number" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const passwordIsCorrect = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!passwordIsCorrect) {
      return res.status(401).json({ message: "current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  register,
  login,
  getMe,
  changePassword
};
```

Teaching notes:

```txt
register creates a new user.
login verifies a username and password.
getMe returns information about the logged-in user.
changePassword verifies the old password before saving the new password hash.
```

---

# Phase 11 — Create the Authentication Middleware

Create `src/middleware/authMiddleware.js`:

```js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "authorization token required" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ message: "user no longer exists" });
    }

    req.user = user;

    return next();
  } catch (error) {
    return res.status(401).json({ message: "invalid or expired token" });
  }
}

module.exports = requireAuth;
```

Important teaching point:

```txt
Middleware runs before the controller.
If the token is valid, the middleware adds req.user.
If the token is missing or invalid, the request stops.
```

---

# Phase 12 — Create the Auth Routes

Create `src/routes/authRoutes.js`:

```js
const express = require("express");
const {
  register,
  login,
  getMe,
  changePassword
} = require("../controllers/authController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.patch("/change-password", requireAuth, changePassword);

module.exports = router;
```

The routes define the URLs.

The controller functions define what happens when those URLs are requested.

---

# Phase 13 — Create the Transaction Controller

Create `src/controllers/transactionController.js`:

```js
const Transaction = require("../models/Transaction");

async function createTransaction(req, res) {
  try {
    const {
      creditCardNickname,
      cardType,
      date,
      amount,
      amendment,
      comment
    } = req.body;

    if (!creditCardNickname || !cardType || !date || amount === undefined) {
      return res.status(400).json({
        message: "creditCardNickname, cardType, date, and amount are required"
      });
    }

    const transaction = await Transaction.create({
      creditCardNickname,
      cardType,
      date,
      amount,
      amendment: amendment || false,
      comment: comment || "",
      createdBy: req.user._id
    });

    return res.status(201).json(transaction);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getTransactions(req, res) {
  try {
    const filter = {};

    if (req.query.creditCardNickname) {
      filter.creditCardNickname = req.query.creditCardNickname;
    }

    if (req.query.cardType) {
      filter.cardType = req.query.cardType;
    }

    if (req.query.date) {
      const start = new Date(req.query.date);
      const end = new Date(req.query.date);
      end.setDate(end.getDate() + 1);

      filter.date = {
        $gte: start,
        $lt: end
      };
    }

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};

      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }

      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setDate(end.getDate() + 1);
        filter.date.$lt = end;
      }
    }

    const transactions = await Transaction.find(filter)
      .populate("createdBy", "username role")
      .sort({ date: -1, createdAt: -1 });

    return res.json(transactions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getTransactionById(req, res) {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("createdBy", "username role");

    if (!transaction) {
      return res.status(404).json({ message: "transaction not found" });
    }

    return res.json(transaction);
  } catch (error) {
    return res.status(400).json({ message: "invalid transaction id" });
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById
};
```

This controller assumes that `req.user` exists.

That means these controller functions should only be used behind the authentication middleware.

---

# Phase 14 — Create the Transaction Routes

Create `src/routes/transactionRoutes.js`:

```js
const express = require("express");
const {
  createTransaction,
  getTransactions,
  getTransactionById
} = require("../controllers/transactionController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", requireAuth, createTransaction);
router.get("/", requireAuth, getTransactions);
router.get("/:id", requireAuth, getTransactionById);

module.exports = router;
```

Notice that every transaction route uses `requireAuth`.

This means users must be logged in before they can use the Transactions API.

---

# Phase 15 — Create the Server

Create `src/server.js`:

```js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Transactions 3 API is running",
    features: ["users", "authentication", "protected transactions"]
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
```

The server is now small.

Most logic is in controllers, routes, models, and middleware.

---

# Phase 16 — Seed the Admin User

Create `src/seed/seedUsers.js`:

```js
require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function seedUsers() {
  try {
    await connectDB();

    const username = "admin";
    const plainPassword = "secret321";

    const existingAdmin = await User.findOne({ username });

    if (existingAdmin) {
      console.log("Admin user already exists");
      await mongoose.connection.close();
      return;
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await User.create({
      username,
      passwordHash,
      role: "admin"
    });

    console.log("Admin user created");
    console.log("username: admin");
    console.log("password: secret321");

    await mongoose.connection.close();
  } catch (error) {
    console.error(error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedUsers();
```

Run the seed program from inside the container:

```bash
npm run seed:users
```

Expected output:

```txt
Connected to MongoDB
Admin user created
username: admin
password: secret321
```

If you run it again, you should see:

```txt
Admin user already exists
```

This prevents duplicate admin users.

---

# Phase 17 — Start the App Locally

From the project folder, run:

```bash
docker compose up --build
```

Or, if you are already inside the dev container, run:

```bash
npm run dev
```

Visit this URL in the browser:

```txt
http://localhost:3000/
```

Expected response:

```json
{
  "message": "Transactions 3 API is running",
  "features": ["users", "authentication", "protected transactions"]
}
```

---

# Phase 18 — Test Registration with Postman

Create a new request in Postman.

```txt
POST http://localhost:3000/api/auth/register
```

Set the body to:

```txt
Body -> raw -> JSON
```

Use this JSON:

```json
{
  "username": "maria",
  "fullName": "Maria Garcia",
  "password": "hello123"
}
```

Expected result:

```json
{
  "message": "user registered successfully",
  "token": "long-token-value",
  "user": {
    "id": "mongodb-id",
    "username": "maria",
    "fullName": "Maria Garcia",
    "role": "user"
  }
}
```

Now test the password rule.

Try this:

```json
{
  "username": "baduser",
  "password": "abcdef"
}
```

Expected result:

```json
{
  "message": "password must include at least one number"
}
```

---

# Phase 19 — Test Login with Postman

Create a new request:

```txt
POST http://localhost:3000/api/auth/login
```

Use the seeded admin account:

```json
{
  "username": "admin",
  "password": "secret321"
}
```

Expected result:

```json
{
  "message": "login successful",
  "token": "long-token-value",
  "user": {
    "id": "mongodb-id",
    "username": "admin",
    "role": "admin"
  }
}
```

Copy the token.

You will need it for protected routes.

---

# Phase 20 — Copy the Token in Postman

After login, copy the token value from the response.

It will look something like this:

```txt
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

In Postman, open a protected request.

Go to:

```txt
Authorization
```

Choose:

```txt
Bearer Token
```

Paste the token into the token box.

Postman will automatically send the header:

```txt
Authorization: Bearer your-token-here
```

Alternative method:

Go to:

```txt
Headers
```

Add this header manually:

```txt
Key: Authorization
Value: Bearer your-token-here
```

There must be a space between `Bearer` and the token.

---

# Phase 21 — Test the /me Route

Create a new request:

```txt
GET http://localhost:3000/api/auth/me
```

Add the Bearer token.

Expected result:

```json
{
  "user": {
    "id": "mongodb-id",
    "username": "admin",
    "role": "admin"
  }
}
```

Now remove the token and send the request again.

Expected result:

```json
{
  "message": "authorization token required"
}
```

This proves that the route is protected.

---

# Phase 22 — Test Change Password

Create a new request:

```txt
PATCH http://localhost:3000/api/auth/change-password
```

Add the Bearer token.

Use this JSON body:

```json
{
  "currentPassword": "secret321",
  "newPassword": "newpass123"
}
```

Expected result:

```json
{
  "message": "password changed successfully"
}
```

Now try to log in with the old password:

```json
{
  "username": "admin",
  "password": "secret321"
}
```

Expected result:

```json
{
  "message": "invalid username or password"
}
```

Now log in with the new password:

```json
{
  "username": "admin",
  "password": "newpass123"
}
```

Expected result:

```json
{
  "message": "login successful",
  "token": "new-token-value",
  "user": {
    "id": "mongodb-id",
    "username": "admin",
    "role": "admin"
  }
}
```

Important:

After changing the password, use the new login response token for future requests.

---

# Phase 23 — Test Creating a Transaction

Create a new request:

```txt
POST http://localhost:3000/api/transactions
```

Add the Bearer token.

Use this JSON body:

```json
{
  "creditCardNickname": "Costco Visa",
  "cardType": "Visa",
  "date": "2026-05-17",
  "amount": 42.75,
  "amendment": false,
  "comment": "Gas"
}
```

Expected result:

```json
{
  "creditCardNickname": "Costco Visa",
  "cardType": "Visa",
  "date": "2026-05-17T00:00:00.000Z",
  "amount": 42.75,
  "amendment": false,
  "comment": "Gas",
  "createdBy": "mongodb-user-id",
  "_id": "mongodb-transaction-id",
  "createdAt": "2026-05-17T00:00:00.000Z",
  "updatedAt": "2026-05-17T00:00:00.000Z"
}
```

Now try the same request without a token.

Expected result:

```json
{
  "message": "authorization token required"
}
```

---

# Phase 24 — Test Reading Transactions

Create a new request:

```txt
GET http://localhost:3000/api/transactions
```

Add the Bearer token.

Expected result:

```json
[
  {
    "_id": "mongodb-transaction-id",
    "creditCardNickname": "Costco Visa",
    "cardType": "Visa",
    "date": "2026-05-17T00:00:00.000Z",
    "amount": 42.75,
    "amendment": false,
    "comment": "Gas",
    "createdBy": {
      "_id": "mongodb-user-id",
      "username": "admin",
      "role": "admin"
    },
    "createdAt": "2026-05-17T00:00:00.000Z",
    "updatedAt": "2026-05-17T00:00:00.000Z"
  }
]
```

You can filter transactions:

```txt
GET http://localhost:3000/api/transactions?cardType=Visa
GET http://localhost:3000/api/transactions?creditCardNickname=Costco%20Visa
GET http://localhost:3000/api/transactions?date=2026-05-17
GET http://localhost:3000/api/transactions?startDate=2026-05-01&endDate=2026-05-31
```

---

# Phase 25 — Test Reading One Transaction

Copy a transaction `_id` from the previous response.

Create a request like this:

```txt
GET http://localhost:3000/api/transactions/PASTE_TRANSACTION_ID_HERE
```

Add the Bearer token.

Expected result:

```json
{
  "_id": "mongodb-transaction-id",
  "creditCardNickname": "Costco Visa",
  "cardType": "Visa",
  "date": "2026-05-17T00:00:00.000Z",
  "amount": 42.75,
  "amendment": false,
  "comment": "Gas",
  "createdBy": {
    "_id": "mongodb-user-id",
    "username": "admin",
    "role": "admin"
  },
  "createdAt": "2026-05-17T00:00:00.000Z",
  "updatedAt": "2026-05-17T00:00:00.000Z"
}
```

---

# Phase 26 — Check MongoDB Manually

Inside the container terminal, open `mongosh`:

```bash
mongosh mongodb://db:27017/transactions3
```

Show collections:

```js
show collections
```

You should see something like:

```txt
transactions
users
```

Find users:

```js
db.users.find().pretty()
```

Notice that the user has `passwordHash`, not `password`.

Find transactions:

```js
db.transactions.find().pretty()
```

Exit:

```js
exit
```

---

# Phase 27 — Heroku Preparation

Before deploying to Heroku, the app must use MongoDB Atlas.

Heroku will run the Node app.

MongoDB Atlas will host the database.

The local Docker MongoDB database is only for development.

---

# Phase 28 — Create a MongoDB Atlas Database

In MongoDB Atlas:

1. Create a free cluster.
2. Create a database user.
3. Save the username and password.
4. Add your IP address to the network access list.
5. For classroom simplicity, you may temporarily allow access from anywhere:

```txt
0.0.0.0/0
```

For production systems, this is not ideal. For class demos, it is often used to avoid network problems.

Get your connection string.

It will look like this:

```txt
mongodb+srv://USERNAME:PASSWORD@cluster-name.mongodb.net/transactions3?retryWrites=true&w=majority
```

Replace `USERNAME` and `PASSWORD` with your real Atlas database username and password.

---

# Phase 29 — Create a Heroku App

Login to Heroku from your computer terminal:

```bash
heroku login
```

Create the Heroku app:

```bash
heroku create your-transactions3-app-name
```

Example:

```bash
heroku create csc3221-transactions3-demo
```

---

# Phase 30 — Set Heroku Environment Variables

Set the MongoDB Atlas connection string:

```bash
heroku config:set MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@cluster-name.mongodb.net/transactions3?retryWrites=true&w=majority"
```

Set the JWT secret:

```bash
heroku config:set JWT_SECRET="replace_this_with_a_long_random_secret_for_heroku"
```

Set the token expiration:

```bash
heroku config:set JWT_EXPIRES_IN="1d"
```

Check the config variables:

```bash
heroku config
```

Do not put these secrets in GitHub.

---

# Phase 31 — Prepare Git for Deployment

Make sure your files are committed:

```bash
git add .
git commit -m "Create transactions API with authentication"
```

Check Heroku remotes:

```bash
git remote -v
```

If your Heroku remote is missing, add it:

```bash
heroku git:remote -a your-transactions3-app-name
```

---

# Phase 32 — Deploy to Heroku

Deploy:

```bash
git push heroku main
```

If your branch is named `master`, use:

```bash
git push heroku master
```

Watch the logs:

```bash
heroku logs --tail
```

Open the app:

```bash
heroku open
```

Expected response:

```json
{
  "message": "Transactions 3 API is running",
  "features": ["users", "authentication", "protected transactions"]
}
```

---

# Phase 33 — Seed the Admin User on Heroku

Run the seed script on Heroku:

```bash
heroku run npm run seed:users
```

Expected output:

```txt
Connected to MongoDB
Admin user created
username: admin
password: secret321
```

If the admin already exists, you should see:

```txt
Admin user already exists
```

---

# Phase 34 — Test the Heroku API in Postman

Use your Heroku URL instead of localhost.

Example:

```txt
https://your-transactions3-app-name.herokuapp.com
```

Login:

```txt
POST https://your-transactions3-app-name.herokuapp.com/api/auth/login
```

Body:

```json
{
  "username": "admin",
  "password": "secret321"
}
```

Copy the returned token.

Use it on protected requests.

Create a transaction:

```txt
POST https://your-transactions3-app-name.herokuapp.com/api/transactions
```

Body:

```json
{
  "creditCardNickname": "Amazon Visa",
  "cardType": "Visa",
  "date": "2026-05-18",
  "amount": 19.99,
  "amendment": false,
  "comment": "Book purchase"
}
```

Read transactions:

```txt
GET https://your-transactions3-app-name.herokuapp.com/api/transactions
```

Remember to include the Bearer token.

---

# Phase 35 — Common Errors

## Error: authorization token required

Cause:

```txt
You forgot to send the Bearer token.
```

Fix:

```txt
In Postman, go to Authorization -> Bearer Token and paste the token.
```

## Error: invalid or expired token

Possible causes:

```txt
The token is expired.
The token was copied incorrectly.
The JWT_SECRET changed after the token was created.
```

Fix:

```txt
Log in again and copy a new token.
```

## Error: invalid username or password

Possible causes:

```txt
The user does not exist.
The password is wrong.
The admin user has not been seeded.
The admin password was changed.
```

Fix:

```bash
npm run seed:users
```

Or on Heroku:

```bash
heroku run npm run seed:users
```

## Error: MONGODB_URI is missing

Cause:

```txt
The .env file is missing locally, or the Heroku config variable is missing.
```

Fix locally:

```bash
cp .env.example .env
```

Fix on Heroku:

```bash
heroku config:set MONGODB_URI="your-atlas-connection-string"
```

## Error: MongoServerSelectionError

Possible causes:

```txt
MongoDB container is not running locally.
Atlas network access is not configured.
Atlas username or password is wrong.
The connection string is incorrect.
```

Fix locally:

```bash
docker compose up --build
```

Fix on Atlas:

```txt
Check Database Access.
Check Network Access.
Check the connection string.
```

---

# Phase 36 — Complete Source Code Reference

This section lists the complete source code for the important files.

## package.json

```json
{
  "name": "transactions3-api",
  "version": "1.0.0",
  "description": "Transactions API with authentication, MongoDB, and Heroku deployment",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed:users": "node src/seed/seedUsers.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

## src/server.js

```js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Transactions 3 API is running",
    features: ["users", "authentication", "protected transactions"]
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
```

## src/config/db.js

```js
const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from environment variables");
  }

  await mongoose.connect(mongoUri);

  console.log("Connected to MongoDB");
}

module.exports = connectDB;
```

## src/models/User.js

```js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
```

## src/models/Transaction.js

```js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    creditCardNickname: {
      type: String,
      required: true,
      trim: true
    },
    cardType: {
      type: String,
      required: true,
      enum: ["Visa", "Master", "Amex", "Discover", "Other"]
    },
    date: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    amendment: {
      type: Boolean,
      default: false
    },
    comment: {
      type: String,
      trim: true,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
```

## src/controllers/authController.js

```js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function passwordHasNumber(password) {
  return /\d/.test(password);
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
}

async function register(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters long" });
    }

    if (!passwordHasNumber(password)) {
      return res.status(400).json({ message: "password must include at least one number" });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({ message: "username is already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      passwordHash,
      role: "user"
    });

    const token = createToken(user);

    return res.status(201).json({
      message: "user registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "invalid username or password" });
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsCorrect) {
      return res.status(401).json({ message: "invalid username or password" });
    }

    const token = createToken(user);

    return res.json({
      message: "login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getMe(req, res) {
  return res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    }
  });
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "new password must be at least 6 characters long" });
    }

    if (!passwordHasNumber(newPassword)) {
      return res.status(400).json({ message: "new password must include at least one number" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const passwordIsCorrect = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!passwordIsCorrect) {
      return res.status(401).json({ message: "current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  register,
  login,
  getMe,
  changePassword
};
```

## src/middleware/authMiddleware.js

```js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "authorization token required" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ message: "user no longer exists" });
    }

    req.user = user;

    return next();
  } catch (error) {
    return res.status(401).json({ message: "invalid or expired token" });
  }
}

module.exports = requireAuth;
```

## src/routes/authRoutes.js

```js
const express = require("express");
const {
  register,
  login,
  getMe,
  changePassword
} = require("../controllers/authController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.patch("/change-password", requireAuth, changePassword);

module.exports = router;
```

## src/routes/transactionRoutes.js

```js
const express = require("express");
const {
  createTransaction,
  getTransactions,
  getTransactionById
} = require("../controllers/transactionController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", requireAuth, createTransaction);
router.get("/", requireAuth, getTransactions);
router.get("/:id", requireAuth, getTransactionById);

module.exports = router;
```

## src/controllers/transactionController.js

```js
const Transaction = require("../models/Transaction");

async function createTransaction(req, res) {
  try {
    const {
      creditCardNickname,
      cardType,
      date,
      amount,
      amendment,
      comment
    } = req.body;

    if (!creditCardNickname || !cardType || !date || amount === undefined) {
      return res.status(400).json({
        message: "creditCardNickname, cardType, date, and amount are required"
      });
    }

    const transaction = await Transaction.create({
      creditCardNickname,
      cardType,
      date,
      amount,
      amendment: amendment || false,
      comment: comment || "",
      createdBy: req.user._id
    });

    return res.status(201).json(transaction);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getTransactions(req, res) {
  try {
    const filter = {};

    if (req.query.creditCardNickname) {
      filter.creditCardNickname = req.query.creditCardNickname;
    }

    if (req.query.cardType) {
      filter.cardType = req.query.cardType;
    }

    if (req.query.date) {
      const start = new Date(req.query.date);
      const end = new Date(req.query.date);
      end.setDate(end.getDate() + 1);

      filter.date = {
        $gte: start,
        $lt: end
      };
    }

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};

      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }

      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setDate(end.getDate() + 1);
        filter.date.$lt = end;
      }
    }

    const transactions = await Transaction.find(filter)
      .populate("createdBy", "username role")
      .sort({ date: -1, createdAt: -1 });

    return res.json(transactions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getTransactionById(req, res) {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("createdBy", "username role");

    if (!transaction) {
      return res.status(404).json({ message: "transaction not found" });
    }

    return res.json(transaction);
  } catch (error) {
    return res.status(400).json({ message: "invalid transaction id" });
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById
};
```

## src/seed/seedUsers.js

```js
require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function seedUsers() {
  try {
    await connectDB();

    const username = "admin";
    const plainPassword = "secret321";

    const existingAdmin = await User.findOne({ username });

    if (existingAdmin) {
      console.log("Admin user already exists");
      await mongoose.connection.close();
      return;
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await User.create({
      username,
      passwordHash,
      role: "admin"
    });

    console.log("Admin user created");
    console.log("username: admin");
    console.log("password: secret321");

    await mongoose.connection.close();
  } catch (error) {
    console.error(error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedUsers();
```

---

# Phase 37 — Suggested Student Exercises

After the base project works, students can extend it.

## Exercise 1

Add a `fullName` field to the user model.

Update registration so users can provide:

```json
{
  "username": "maria",
  "fullName": "Maria Garcia",
  "password": "hello123"
}
```

## Exercise 2

Add a route that only admins can use.

Example:

```txt
GET /api/auth/users
```

This route should return all users.

Hint:

Create a second middleware function called `requireAdmin`.

## Exercise 3

Limit normal users so they can only see transactions they created.

Admins can see all transactions.

Hint:

Use `req.user.role` in `getTransactions`.

## Exercise 4

Add pagination to transactions.

Example:

```txt
GET /api/transactions?page=1&limit=10
```

## Exercise 5

Add a front end that supports:

- Register
- Login
- Save token in local storage
- Create transaction
- View transactions
- Change password
- Logout

---

# Final Checklist

By the end of this project, the app should be able to:

- Connect to MongoDB locally using Docker
- Connect to MongoDB Atlas on Heroku
- Seed an admin user
- Register new users
- Enforce passwords with at least one number
- Hash passwords before saving them
- Log users in
- Return JWT tokens
- Protect routes using middleware
- Allow logged-in users to change passwords
- Create transactions only when authenticated
- Read transactions only when authenticated
- Deploy successfully to Heroku

---

# Concept Review

## Model

The model describes the data and talks to MongoDB.

Examples:

```txt
User.js
Transaction.js
```

## Controller

The controller contains the request and response logic.

Examples:

```txt
authController.js
transactionController.js
```

## Route

The route connects URLs to controller functions.

Examples:

```txt
authRoutes.js
transactionRoutes.js
```

## Middleware

Middleware runs between the request and the controller.

Example:

```txt
authMiddleware.js
```

The authentication middleware checks whether the user sent a valid token.

## Token

A token is proof that the user logged in successfully.

The client must send the token on protected requests.

```txt
Authorization: Bearer token-goes-here
```

## Password Hash

A password hash is what we store instead of the real password.

The server compares the login password with the stored hash using bcrypt.

---

# End

This project extends the Transactions API into a more realistic back-end app.

It introduces the structure and security concepts used in many production Node, Express, and MongoDB applications.
