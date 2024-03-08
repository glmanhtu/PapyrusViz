const fs = require('fs');
const pathUtils = require('./path.utils')


module.exports.readAppData = function() {
    const dataFile = pathUtils.fromAppData('data.json');
    if (!fs.existsSync(dataFile) || !fs.lstatSync(dataFile).isFile()) {
        this.writeAppData({
            'projects': []
        });
    }
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

module.exports.writeAppData = function(appData) {
    const dataFile = pathUtils.fromAppData('data.json');
    fs.writeFileSync(dataFile, JSON.stringify(appData));
}


module.exports.getItemList = function(data, callback) {
    const result = [];
    data.forEach(element => {
        result.push(callback(element))
    });
    return result;
}