const http = require('http');
http.get('http://localhost:5001/api/health', (res) => {
  console.log("Health code:", res.statusCode);
});
