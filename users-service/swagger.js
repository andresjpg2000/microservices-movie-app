const swaggerAutogen = require("swagger-autogen")();
const doc = {
  info: {
    title: "My Users API",
    description: "Swagger documentation",
  },
  host: "localhost:3003",
  schemes: ["http"],
  tags: [
    // the sections that will be presented in swagger page
    { name: "Users", description: "Users related endpoints" },
  ],
  definitions: {
    // the objects used in the request and response bodies
    GetUser: {
      // GET response bodies come with id
      id: 123,
      name: "Example Name",
      email: "example@mail.com",
    },
    CreateUser: {
      // POST/PUT request bodies are sent without id
      name: "Example Name",
      email: "example@mail.com",
    },
  },
};
const outputFile = "./swagger-output.json";
const endpointsFiles = ["./app.js"];
swaggerAutogen(outputFile, endpointsFiles, doc);
