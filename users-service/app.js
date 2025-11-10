const express = require("express");
const app = express();
app.use(express.json());
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");
const jwt = require("jsonwebtoken");
const env = require("dotenv");
env.config({ path: "./.env" });

const { authenticateToken, authorizeRole, checkUserIDMatch } = require("./auth");

const JWT_SECRET = process.env.JWT_SECRET

let users = [
  { id: 1, name: "Alice", password: "1234", email: "alice@example.com", role: "user" },
  { id: 2, name: "Bob", password: "1234", email: "bob@example.com", role: "admin" },
];

function addUser(newUser) {
  // check if email exists
  const emailExists = users.some((user) => user.email === newUser.email);
  if (emailExists) {
    return res.status(409).json({ error: "Email already exists" });
  }
  // check newUser has name and email
  if (!newUser.name || !newUser.email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  // check if password is valid
  if (!newUser.password || newUser.password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters long" });
  }

  if (!newUser.role) {
    newUser.role = "user";
  }

  newUser.id = users.length + 1;
  users.push(newUser);
}

function editUser(userId, updatedData) {
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  // check if at least one field is being updated
  if (!updatedData.name && !updatedData.email) {
    throw new Error(
      "At least one field (name or email) must be provided for update",
    );
  }
  // check if updated email exists in other users
  if (updatedData.email) {
    const emailExists = users.some(
      (u) => u.email === updatedData.email && u.id !== userId,
    );
    if (emailExists) {
      return res.status(409).json({ error: "Email already exists" });
    }
  }
  // check if email is valid format
  if (updatedData.email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(updatedData.email)) {
      throw new Error("Invalid email format");
    }
  }

  // Update user data
  Object.assign(user, updatedData);
  return user;
}

function deleteUser(userId) {
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  users.splice(userIndex, 1);
  return true;
}

app.post("/register", (req, res) => {
  /*
    #swagger.tags = ["Users"]
    #swagger.description = 'Endpoint to create a new user.' 
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'New user object',
      required: true,
      schema: { $ref: '#/definitions/CreateUser' }
    }
    #swagger.responses[201] = { description: 'User created successfully', schema: {
      $ref: '#/definitions/GetUser'} }
    #swagger.responses[409] = { description: 'Email already exists' }
    #swagger.responses[400] = { description: 'Bad Request' }
    #swagger.responses[400] = { description: 'Password must be at least 4 characters long' }
  */

  try {
    addUser(req.body);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/users/:id", authenticateToken, checkUserIDMatch, (req, res) => {
  /*
    #swagger.tags = ["Users"]
    #swagger.description = 'Endpoint to update a user by ID.' 
    #swagger.parameters['id'] = {
      description: 'ID of the user to update',
      required: true,
      type: 'integer'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'User data to update',
      required: true,
      schema: {
        name: "New Name",
        email: "new.email@example.com"
      } 
    }
    #swagger.responses[200] = {
      description: 'User updated successfully.',
      schema: {
        id: 1,
        name: "New Name",
        email: "new.email@example.com"
      }
    }
    #swagger.responses[404] = {
      description: 'User not found.',
      schema: { error: "User not found" }
    }
    #swagger.responses[400] = {
      description: 'Bad Request.',
      schema: { error: "Error message" }
    }
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: "Access denied. Token missing." }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: insufficient privileges.',
      schema: { error: "Access forbidden: insufficient privileges." }
    }
  */
  const userId = parseInt(req.params.id);
  try {
    const updatedUser = editUser(userId, req.body);
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/users/:id", authenticateToken, checkUserIDMatch, (req, res) => {
  /*
    #swagger.tags = ["Users"]
    #swagger.description = 'Endpoint to delete a user by ID.' 
    #swagger.parameters['id'] = {
      description: 'ID of the user to delete',
      required: true,
      type: 'integer'
    }
    #swagger.responses[204] = { description: 'User deleted successfully.' }
    #swagger.responses[404] = {
      description: 'User not found.',
      schema: { error: "User not found" }
    }
    #swagger.responses[400] = {
      description: 'Bad Request.',
      schema: { error: "Error message" }
    } 
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: "Access denied. Token missing." }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: insufficient privileges.',
      schema: { error: "Access forbidden: insufficient privileges." }
    }  
  */

  const userId = parseInt(req.params.id);
  try {
    deleteUser(userId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/users", authenticateToken, authorizeRole("admin"), (req, res) => {
  /*
    #swagger.tags = ["Users"]
    #swagger.description = 'Endpoint to get all users.'
    #swagger.responses[200] = { description: 'List of users', schema: {
      type: 'array',
      items: { $ref: '#/definitions/GetUser' }
    } }
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: "Access denied. Token missing." }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: insufficient privileges.',
      schema: { error: "Access forbidden: insufficient privileges." }
    }
  */
  

  res.json(users);
});

app.get("/users/:id", authenticateToken, checkUserIDMatch, (req, res) => {
  /*
    #swagger.tags = ["Users"]
    #swagger.description = 'Endpoint to get a user by ID.'    
    #swagger.parameters['id'] = {
      description: 'ID of the user to retrieve',
      required: true,
      type: 'integer'
    }   
    #swagger.responses[200] = {
      description: 'User retrieved successfully.',
      schema: { $ref: '#/definitions/GetUser' }
    }
    #swagger.responses[404] = {
      description: 'User not found.',
      schema: { error: "User not found" }
    }
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: "Access denied. Token missing." }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: insufficient privileges.',
      schema: { error: "Access forbidden: insufficient privileges." }
    } 
  */

  const user = users.find((u) => u.id === parseInt(req.params.id));
  user ? res.json(user) : res.status(404).json({ error: "User not found" });
});

app.post("/login", (req, res) => {
  /*
    #swagger.tags = ["Users"]
    #swagger.description = 'Endpoint to login a user and receive a JWT token.'    
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'User credentials',
      required: true,
      schema: {
        email: "user@example.com",
        password: "userpassword"
      }
    }
    #swagger.responses[200] = {
      description: 'Login successful, returns JWT token.',
      schema: {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    #swagger.responses[401] = {
      description: 'Invalid credentials.',
      schema: { error: "Invalid credentials" }
    }
  */  

 const { email, password } = req.body;
 const user = users.find(u => u.email === email && u.password === password);
 if (!user) {
 return res.status(401).json({ error: "Invalid credentials" });
 }
 const token = jwt.sign({
 id: user.id,
 email: user.email,
 role:user.role }, JWT_SECRET, { expiresIn: "1h" });
 res.json({ token });
});

app.listen(3003, () => console.log("Users service running on port 3003"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
