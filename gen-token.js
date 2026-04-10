
const jwt = require('jsonwebtoken');

const token = jwt.sign(

  {

    sub: 'e167c9d1-0680-4cbb-80a0-5c75453584b9',

    role: 'authenticated',

    exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)

  },

  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTY3YzlkMS0wNjgwLTRjYmItODBhMC01Yzc1NDUzNTg0YjkiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTgwNzM2NDIyNywiaWF0IjoxNzc1ODI4MjI3fQ.WSjYcESfqUNG2BmIoVXxpuB16BhoCJ8KhtvvWeTvbMo

);

console.log(token);

