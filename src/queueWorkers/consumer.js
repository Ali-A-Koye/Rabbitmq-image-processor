const fs = require("fs");
const sharp = require("sharp");
const { promisify } = require("util");

const Broker = require("../services/rabbitMQ");

const { fileExists } = require("../utils/functions");

const RMQConsumer = new Broker().init();
const pipeline = promisify(require("stream").pipeline);
const EXCHANGE = "upload";

/**
 * Process 1:1 message and stores in db, also processes group messages 1 by 1
 * @param {String} payload - message in json string format
 * @param {Function} ack - callback function
 */
const handleImage = async (payload, ack) => {
  try {
    const fileName = payload.content.toString();
    const fileUrl = `./src/uploads/original/${fileName}`;

    // we first need to make sure if the file exist and is readable
    const exists = await fileExists(fileUrl);

    if (!exists) {
      ack();
      throw new Error(`ERR:FILE ${fileUrl} not readable`);
    }
    // we create a read stream
    const readStream = fs.createReadStream(fileUrl);

    let transform = sharp();

    const [width, height] = [400, 300];

    // we resize the image
    transform = transform.resize(width || 400, height || 300);

    // we pipe our readstream to a writestream
    pipeline(
      readStream.pipe(transform),
      fs.createWriteStream(`./src/uploads/thumbnail/${fileName}`)
    );
    // we acknowledge the delivery
    ack();
  } catch (error) {
    console.error(error);
  }
};

async function processUploads() {
  try {
    const consumer = await RMQConsumer;
    await consumer.createEx({
      name: EXCHANGE,
      type: "direct",
    });
    consumer.subscribe(
      { exchange: "upload", bindingKey: "image" },
      handleImage
    );
  } catch (error) {
    console.log(error);
  }
}

processUploads();

// close channek, connection on exit
process.on("exit", (code) => {
  RMQConsumer.channel.close();
  RMQConsumer.connection.close();
});
