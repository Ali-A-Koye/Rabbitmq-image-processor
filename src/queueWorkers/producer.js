
const EXCHANGE = 'upload'
module.exports = async (instance, { message, routingKey }) => {
    try {
        await instance.createEx({
            name: EXCHANGE,
            type: 'direct'
        })
        await instance.publish({ ex: EXCHANGE, routingKey }, message)
        return Promise.resolve()
    } catch (error) {
        return Promise.reject(error)
    }
}