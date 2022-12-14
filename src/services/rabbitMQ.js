require('dotenv').config()
const amqp = require('amqplib')
const _ = require('lodash')
class MessageBroker {
    constructor() {
        this.queues = {}
    }

    async init () {
        this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost')
        this.channel = await this.connection.createChannel()
        return this
    }

    async createEx ({ name, type, durable = true }) { //create exchange
        if (!this.connection) await this.init()
        await this.channel.assertExchange(name, type, { durable })
        this.exchange = name
        return this
    }

    async publish ({ ex, routingKey }, msg) {
        const queue = `${ex}.${routingKey}`
        await this.channel.assertQueue(queue, { durable: true })
        this.channel.bindQueue(queue, ex, routingKey)
        this.channel.publish(ex, routingKey, Buffer.from(msg))
    }

    async subscribe ({ exchange, bindingKey }, handler) { //consumer
        const queue = `${exchange}.${bindingKey}`
        if (!this.connection) {
            await this.init()
        }
        await this.channel.assertQueue(queue, { durable: true })
        this.channel.bindQueue(queue, exchange, bindingKey)
        this.queues[queue] = [handler]
        this.channel.consume(
            queue,
            async (msg) => {
                const ack = _.once(() => this.channel.ack(msg))
                this.queues[queue].forEach(h => h(msg, ack))
            }
        )
        return () => this.unsubscribe(queue, handler)
    }

    async unsubscribe (queue, handler) {
        _.pull(this.queues[queue], handler)
    }
}

module.exports = MessageBroker