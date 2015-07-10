var fixeddb = require('./')
var fs = require('fs')

var db = fixeddb('bench.db', 1024)

try {
  fs.unlinkSync('bench.db')
} catch (err) {
  // do nothing
}

var entry = new Buffer(1024)
entry.fill(0)

var ws = db.createWriteStream()
var written = 0
var now = Date.now()
var inc = 0

function delta () {
  return Date.now() - now
}

function loop () {
  for (var i = 0; i < 63; i++) {
    ws.write(entry)
  }
  written += 64 * entry.length
  if (++inc % 1024 === 0) console.log((1000 * written / delta()) + ' b/s')
  ws.write(entry, loop)
}

loop()