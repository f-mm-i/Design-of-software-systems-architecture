const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Mental Maps API is running on http://localhost:${PORT}/api/v1`);
});
