const swaggerAutogen = require("swagger-autogen")();
const doc = {
  info: {
    title: "My API",
    description: "Swagger documentation",
  },
  host: "localhost:3001",
  schemes: ["http"],
  tags: [
    // the sections that will be presented in swagger page
    { name: "Movies", description: "Movies related endpoints" },
  ],
  definitions: {
    // the objects used in the request and response bodies
    GetMovieById: {
      // GET response bodies
      id: 1,
      title: "Inception",
      director: "Christopher Nolan",
      year: 2010,
    },
    CreateMovie: {
      // POST request bodies
      title: "Interstellar",
      year: 2014,
      director: "Christopher Nolan",
    },
  },
};
const outputFile = "./swagger-output.json";
const endpointsFiles = ["./app.js"];
swaggerAutogen(outputFile, endpointsFiles, doc);
