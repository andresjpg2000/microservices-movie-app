const swaggerAutogen = require("swagger-autogen")();
const doc = {
  info: {
    title: "My API",
    description: "Swagger documentation",
  },
  host: "localhost:3002",
  schemes: ["http"],
  tags: [
    // the sections that will be presented in swagger page
    { name: "Reviews", description: "Reviews related endpoints" },
  ],
  definitions: {
    // the objects used in the request and response bodies
    GetReview: {
      // GET response bodies come with id
      id: 1,
      movieId: 1,
      userId: 1,
      text: "Great movie!",
    },
    CreateReview: {
      // POST/PUT request bodies are sent without id
      movieId: 1,
      userId: 1,
      text: "Great movie!",
    },
  },
};
const outputFile = "./swagger-output.json";
const endpointsFiles = ["./app.js"];
swaggerAutogen(outputFile, endpointsFiles, doc);
