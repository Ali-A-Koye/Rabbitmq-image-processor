const fs = require('fs')

exports.fileExists = (path, flag = 1) => {
    return new Promise(function (resolve, reject) {
        let accessConst = null
        if (flag === 2) accessConst = fs.constants.W_OK
        else accessConst = fs.constants.R_OK
        fs.access(path, accessConst, (err) => {
            if (err) {
                if (err.code === 'ENOENT') resolve(false)
                else reject(err)
            } else resolve(true)
        })
    })
}