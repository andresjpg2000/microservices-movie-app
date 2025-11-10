const express = require("express");
const axios = require("axios"); // we'll use this to call the review service
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");
const jwt = require("jsonwebtoken");
const env = require("dotenv");
env.config({ path: "./.env" });

app.use(express.json());

const { authenticateToken, authorizeRole } = require("./auth");

// our "database" data
let movies = [
  { id: 1, title: "Treasure Planet", year: 2002 },
  { id: 2, title: "The Matrix", year: 1999 },
];

// GET all movies
app.get("/movies", (req, res) => {
  /* 
    #swagger.tags = ["Movies"]
    #swagger.description = 'Endpoint to get all movies.' 
    #swagger.responses[200] = {
      description: 'List of movies',
      schema: [
        {
          id: 1,
          title: "Treasure Planet",
          year: 2002
        }
      ]
    }
  */
  res.json(movies);
});

// GET a movie by ID (and fetch its reviews from the Review Service)
app.get("/movies/:id", async (req, res) => {
  /*  
    #swagger.tags = ["Movies"]
    #swagger.description = 'Endpoint to get a movie by ID along with its reviews.' 
    #swagger.parameters['id'] = {
      description: 'ID of the movie to retrieve',
      required: true,
      type: 'integer'
    }
    #swagger.responses[200] = {
      description: 'Movie found successfully.',
      schema: {
        id: 1,
        title: "Treasure Planet",
        year: 2002,
        reviews: [
          {
            id: 1,
            movieId: 1,
            userId: 1,
            text: "Great movie!"
          }
        ]
      }
    }
    #swagger.responses[404] = {
      description: 'Movie not found.',
      schema: { error: "Movie not found" }
    }
    #swagger.responses[500] = {
      description: 'Failed to fetch reviews from the Review Service.',
      schema: { error: "Failed to fetch reviews" }
    }
  */

  const movie = movies.find((m) => m.id === parseInt(req.params.id));
  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  try {
    // call the review service
    const response = await axios.get(
      `http://localhost:3002/reviews?movieId=${movie.id}`,
    );
    const movieReviews = response.data;

    res.json({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      reviews: movieReviews,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// DELETE a movie by ID and the respective reviews
app.delete("/movies/:id", authenticateToken, authorizeRole("admin"), async (req, res) => {
  /* 
    #swagger.tags = ["Movies"]
    #swagger.description = 'Endpoint to delete a movie by ID along with its reviews.' 
    #swagger.parameters['id'] = {
      description: 'ID of the movie to delete',
      required: true,
      type: 'integer'
    }
    #swagger.responses[204] = {
      description: 'Movie and its reviews deleted successfully.'
    }
    #swagger.responses[404] = {
      description: 'Movie not found.',
      schema: { error: "Movie not found" }
    }
    #swagger.responses[403] = {
      description: 'Forbidden - admin role required.',
      schema: { error: "Forbidden: admin role required" }
    }
    #swagger.responses[500] = {
      description: 'Failed to delete reviews from the Review Service.',
      schema: { error: "Failed to delete reviews" }
    }
  */
  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: admin role required" });
  }

  const id = parseInt(req.params.id);
  const movieIndex = movies.findIndex((m) => m.id === id);
  if (movieIndex === -1) {
    return res.status(404).json({ error: "Movie not found" });
  }

  movies.splice(movieIndex, 1); // remove movie from "database"

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  try {
    // call the review service to delete reviews
  await axios.delete(`http://localhost:3002/reviews?movieId=${id}`, {
    headers: { Authorization: req.headers.authorization }
  });

    // 204 No Content - successful deletion, no body
    return res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a movie by ID
app.put("/movies/:id", authenticateToken, authorizeRole("admin"), (req, res) => {
  /* 
    #swagger.tags = ["Movies"]
    #swagger.description = 'Endpoint to update a movie by ID.' 
    #swagger.parameters['id'] = {
      description: 'ID of the movie to update',
      required: true,
      type: 'integer'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Movie data to update',
      required: true,
      schema: {
        title: "New Title",
        year: 2020
      }
    }
    #swagger.responses[200] = {
      description: 'Movie updated successfully.',
      schema: {
        message: "Movie updated",
        movie: {
          id: 1,
          title: "New Title",
          year: 2020
        }
      }
    }
    #swagger.responses[404] = {
      description: 'Movie not found.',
      schema: { error: "Movie not found" }
    }
  */

  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: admin role required" });
  }

  const id = parseInt(req.params.id);
  const movie = movies.find((m) => m.id === id);
  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  const { title, year } = req.body;
  if (title) movie.title = title;
  if (year) movie.year = year;

  res.status(200).json({ message: "Movie updated", movie });
});

// Update partial movie info
app.patch("/movies/:id", authenticateToken, authorizeRole("admin"), (req, res) => {
  /* 
    #swagger.tags = ["Movies"]
    #swagger.description = 'Endpoint to partially update a movie by ID.' 
    #swagger.security = [{"bearerAuth": []}]
    #swagger.parameters['id'] = {
      description: 'ID of the movie to update',
      required: true,
      type: 'integer'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Partial movie data to update (only provided fields will be updated)',
      required: true,
      schema: {
        type: "object",
        properties: {
          title: { type: "string", example: "Partial Title" },
          year: { type: "integer", example: 2002 }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'Movie partially updated successfully.',
      schema: {
        message: "Movie partially updated",
        movie: {
          id: 1,
          title: "Partial Title",
          year: 2002
        }
      }
    }
    #swagger.responses[400] = {
      description: 'Bad request - invalid payload.',
      schema: { error: "Invalid request payload" }
    }
    #swagger.responses[401] = {
      description: 'Unauthorized - missing or invalid token.',
      schema: { error: "Unauthorized" }
    }
    #swagger.responses[403] = {
      description: 'Forbidden - admin role required.',
      schema: { error: "Forbidden: admin role required" }
    }
    #swagger.responses[404] = {
      description: 'Movie not found.',
      schema: { error: "Movie not found" }
    }
  */

  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: admin role required" });
  }

  const id = parseInt(req.params.id);
  const movie = movies.find((m) => m.id === id);
  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  const { title, year } = req.body;
  if (title !== undefined) movie.title = title;
  if (year !== undefined) movie.year = year;

  res.status(200).json({ message: "Movie partially updated", movie });
});

// Create a new movie
app.post("/movies", authenticateToken, authorizeRole("admin"), (req, res) => {
  /*
    #swagger.tags = ["Movies"]
    #swagger.description = 'Endpoint to create a new movie.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Movie data to create',
      required: true,
      schema: {
        type: "object",
        required: ["title", "year"],
        properties: {
          title: { type: "string", example: "Inception" },
          year: { type: "integer", example: 2010 },
          director: { type: "string", example: "Christopher Nolan" }
        }
      }
    }
    #swagger.responses[201] = {
      description: 'Movie created successfully.',
      schema: {
        message: "Movie created",
        movie: {
          id: 3,
          title: "Inception",
          year: 2010,
          director: "Christopher Nolan"
        }
      }
    }
    #swagger.responses[400] = {
      description: 'Bad request - missing required fields.',
      schema: { error: "Title and year are required" }
    }
    #swagger.responses[401] = {
      description: 'Unauthorized - missing or invalid token.',
      schema: { error: "Unauthorized" }
    }
    #swagger.responses[403] = {
      description: 'Forbidden - admin role required.',
      schema: { error: "Forbidden: admin role required" }
    }
  */

  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: admin role required" });
  }

  const { title, year, director } = req.body;
  if (!title || !year) {
    return res.status(400).json({ error: "Title and year are required" });
  }

  const nextId = movies.length ? Math.max(...movies.map((m) => m.id)) + 1 : 1;
  const newMovie = {
    id: nextId,
    title,
    year,
    director,
  };
  movies.push(newMovie);
  res.status(201).json({ message: "Movie created", movie: newMovie });
});

app.listen(3001, () => console.log("Movies service running on port 3001"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(express.json());
