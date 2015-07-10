var fixeddb = require('./')
var from = require('from2')
var fs = require('fs')

var db = fixeddb('bench.db', 64)

try {
  fs.unlinkSync('bench.db')
} catch (err) {
  // do nothing
}

var entry = new Buffer(64)
entry.fill(0)

var ws = db.createWriteStream()
var written = 0
var now = Date.now()
var inc = 0

function delta () {
  return Date.now() - now
}

from({highWaterMark: 64 * 1024}, read).pipe(ws)

function read (size, cb) {
  written += entry.length
  if (++inc % 1024 === 0) console.log((1000 * written / delta()) + ' b/s')
  cb(null, entry)
}
