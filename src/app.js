require("dotenv").config();
const express = require("express");
const Broker = require("./services/rabbitMQ");
const fileUpload = require("express-fileupload");
const publishToExchange = require("./queueWorkers/producer");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const {promisify} = require("util")

const app = express();
app.use(fileUpload());
const RMQProducer = new Broker().init();

app.use(async (req, res, next) => {
  try {
    req.RMQProducer = await RMQProducer;
    next();
  } catch (error) {
    process.exit(1);
  }
});

const saveImage= (data) => {
  const writeFile = promisify(fs.writeFile)
  return new Promise((resolve, reject) => {
    if (!data) {
      reject("File not available!");
    }
    try {
      const fileName = `img_${uuid()}.jpg`;
      
      writeFile(`./src/uploads/original/${fileName}`, data);

      resolve(fileName);
    } catch (error) {}
  });
};

// your routes here
app.post("/upload", async (req, res) => {
  const { data } = req.files.image;
  try { 
    const message = await saveImage(data)
    await publishToExchange(req.RMQProducer, {
      message,
      routingKey: "image",
    });
    res.status(200).send("File uploaded successfuly!")
  } catch (error) {
    res.status(400).send(`File not uploaded!`)
  }
});

app.use((req, res, next) => {
  next(creatError.NotFound());
});

// error handling
app.use((err, req, res, next) => {
  res.status(err.status || 500).send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});
app.listen(process.env.PORT || 3000, () => {
  console.log("server is running", process.env.PORT || 3000);
});

process.on("SIGINT", async () => {
  process.exit(1);
});
process.on("exit", (code) => {
  RMQProducer.channel.close();
  RMQProducer.connection.close();
});