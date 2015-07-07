var fixeddb = require('./')
var db = fixeddb('fixed.db', 5)

var ws = db.createWriteStream()

ws.write('hey-1')
ws.write('hey-2')
ws.write('hey-3')

ws.end(function () {
  db.createReadStream()
    .on('data', console.log)
    .on('end', function () {
      console.log('(no more data)')
    })
})
