const express = require("express");
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");
const env = require("dotenv");
env.config({ path: "./.env" });

const { authenticateToken, authorizeRole } = require("./auth");
app.use(express.json());

let reviews = [
  { id: 1, movieId: 1, userId: 2, text: "Very underrated movie!" },
  { id: 2, movieId: 1, userId: 1, text: "Best animated movie ever." },
  { id: 3, movieId: 2, userId: 1, text: "Classic sci-fi." },
];

// Get all reviews, optionally filtered by movieId
app.get("/reviews", (req, res) => {
  /*
    #swagger.tags = ['Reviews']
    #swagger.parameters['movieId'] = {
       in: 'query',
       description: 'ID of the movie to filter reviews',
       required: false,
       type: 'integer'
    }
    #swagger.responses[200] = {
       description: 'List of reviews',
       schema: { $ref: '#/definitions/GetReview' }
    }
    #swagger.responses[400] = {
       description: 'Invalid movieId parameter',
       schema: { error: 'movieId must be a number' }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: Invalid token.',
      schema: { error: 'Access forbidden: Invalid token.' }
    }
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: 'Access denied. Token missing.' }
    }
  */
  const { movieId } = req.query;
  if (movieId && isNaN(movieId)) {
    return res.status(400).json({ error: "movieId must be a number" });
  }
  if (movieId) {
    const filteredReviews = reviews.filter(
      (r) => r.movieId === parseInt(movieId),
    );
    return res.status(200).json(filteredReviews);
  }
  return res.status(200).json(reviews);
});

// Get a review by ID
app.get("/reviews/:id", authenticateToken, (req, res) => {
  /*
    #swagger.tags = ['Reviews']
    #swagger.description = 'Get a review by ID'
    #swagger.parameters['id'] = {
       in: 'path',
       description: 'ID of the review to retrieve',
       required: true,
       type: 'integer'
    }
    #swagger.responses[200] = {
       description: 'Review found',
       schema: { $ref: '#/definitions/GetReview' }
    }
    #swagger.responses[404] = {
      description: 'Review not found',
      schema: { error: 'Review not found' }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: Invalid token.',
      schema: { error: 'Access forbidden: Invalid token.' }
    }
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: 'Access denied. Token missing.' }
    }
  */
  const review = reviews.find((r) => r.id === parseInt(req.params.id));
  review
    ? res.status(200).json(review)
    : res.status(404).json({ error: "Review not found" });
});

// Create a new review
app.post("/reviews", authenticateToken, (req, res) => {
  /*
    #swagger.tags = ['Reviews']
    #swagger.description = 'Create a new review'
    #swagger.parameters['review'] = {
       in: 'body',
       description: 'Review object to create',
       required: true,
       schema: { $ref: '#/definitions/CreateReview' }
    }
    #swagger.responses[201] = {
       description: 'Review created successfully',
       schema: { $ref: '#/definitions/CreateReview' }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: Invalid token.',
      schema: { error: 'Access forbidden: Invalid token.' }
    }
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: 'Access denied. Token missing' }
    }
  */
  const newReview = { id: reviews.length + 1, ...req.body };
  reviews.push(newReview);
  res.status(201).json(newReview);
});

// DELETE all reviews for a specific movie
app.delete("/reviews", authenticateToken, authorizeRole("admin"), (req, res) => {
  /* 
    #swagger.tags = ['Reviews']
    #swagger.description = 'Delete all reviews of a given movie by movieId'
    #swagger.parameters['movieId'] = {
      in: 'path',
      description: 'ID of the movie whose reviews should be deleted',
      required: true,
      type: 'integer'
    }
    #swagger.responses[204] = {
      description: 'All reviews for the movie deleted successfully.'
    }
    #swagger.responses[404] = {
      description: 'No reviews found for the given movieId.',
      schema: { error: 'No reviews found for this movie' }
    }
  */
  const movieId = parseInt(req.query.movieId);
  if (isNaN(movieId)) {
    return res.status(400).json({ error: "movieId must be a valid number" });
  }

  const beforeCount = reviews.length;
  reviews = reviews.filter(r => r.movieId !== movieId);

  if (reviews.length === beforeCount) {
    return res.status(404).json({ error: "No reviews found for this movie" });
  }

  return res.status(204).send();
});

// delete a review by ID
app.delete("/reviews/:id", authenticateToken, (req, res) => {
  /*
    #swagger.tags = ['Reviews']
    #swagger.description = 'Delete a review by ID'
    #swagger.parameters['id'] = {
       in: 'path',
       description: 'ID of the review to delete',
       required: true,
       type: 'integer'
    }
    #swagger.responses[204] = {
       description: 'Review deleted successfully'
    }
    #swagger.responses[404] = {
      description: 'Review not found',
      schema: { error: 'Review not found' }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: Invalid token.',
      schema: { error: 'Access forbidden: Invalid token.' }
    }
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: 'Access denied. Token missing.' }
    }
  */
  const reviewIndex = reviews.findIndex(
    (r) => r.id === parseInt(req.params.id),
  );
  if (reviewIndex !== -1) {
    reviews.splice(reviewIndex, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ error: "Review not found" });
  }
});


app.put("/reviews/:id", authenticateToken,(req, res) => {
  /* 
    #swagger.tags = ['Reviews']
    #swagger.parameters['id'] = {
       in: 'path',
       description: 'ID of the review to update',
       required: true,
       type: 'integer'
    }
    #swagger.description = 'Update a review by ID'
    #swagger.parameters['body'] = {
        in: 'body',
        description: 'Review data to update',
        required: true,
        schema: { $ref: '#/definitions/CreateReview' }
    }
    #swagger.parameters['review'] = {
       in: 'body',
       description: 'Updated review object',
       required: true,
       schema: { $ref: '#/definitions/GetReview' }
    }
    #swagger.responses[200] = {
       description: 'Review updated successfully',
       schema: { $ref: '#/definitions/GetReview' }
    }
    #swagger.responses[404] = {
      description: 'Review not found',
      schema: { error: 'Review not found' }
    }
    #swagger.responses[403] = {
      description: 'Access forbidden: Invalid token.',
      schema: { error: 'Access forbidden: Invalid token.' }
    }
    #swagger.responses[401] = {
      description: 'Access denied. Token missing.',
      schema: { error: 'Access denied. Token missing.' }
    }
  */
  const reviewIndex = reviews.findIndex(
    (r) => r.id === parseInt(req.params.id),
  );
  if (reviewIndex !== -1) {
    reviews[reviewIndex] = { id: reviews[reviewIndex].id, ...req.body };
    res.status(200).json(reviews[reviewIndex]);
  } else {
    res.status(404).json({ error: "Review not found" });
  }
});

app.listen(3002, () => console.log("Reviews service running on port 3002"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
