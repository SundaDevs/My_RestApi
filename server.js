require("./settings");
const http = require("http");
const app = require("./index");
const PORTHOST = port || 8080;

http.createServer(app).listen(PORTHOST, () => {
    console.log(`Welcome Back MrTakt				 
Server localhost Berjalan
Dengan Port : ` + PORTHOST)
console.log(`Hello ${creator}`)
})
