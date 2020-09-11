const express = require('express')
const app = express()
const port = 3000

app.get('*/', (req, res) => {
  res.send('<h1 style="color:blue;text-align:center;">Welcome to ADMCOE Blog - Version 1.0</h1>')
})

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})