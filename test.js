var tape = require('tape')
var fixeddb = require('./')
var os = require('os')
var path = require('path')
var fs = require('fs')

function tmp () {
  var filename = path.join(os.tmpdir(), 'fixed-entry-db-' + Date.now() + '-' + process.pid + '.db')

  try {
    fs.unlinkSync(filename)
  } catch (err) {
    // do nothing
  }

  return filename
}

tape('append', function (t) {
  var db = fixeddb(tmp(), 10)
  db.append([new Buffer('helloworld'), new Buffer('hellowarld')], function (err) {
    t.error(err)
    db.get(0, function (err, buf) {
      t.error(err)
      t.same(buf, new Buffer('helloworld'))
      db.get(1, function (err, buf) {
        t.error(err)
        t.same(buf, new Buffer('hellowarld'))
        t.end()
      })
    })
  })
})

tape('append batch', function (t) {
  var db = fixeddb(tmp(), 10)
  db.append(new Buffer('helloworld'), function (err) {
    t.error(err)
    db.get(0, function (err, buf) {
      t.error(err)
      t.same(buf, new Buffer('helloworld'))
      t.end()
    })
  })
})

tape('append twice', function (t) {
  var db = fixeddb(tmp(), 10)
  db.append(new Buffer('hej verden'))
  db.append(new Buffer('helloworld'), function (err) {
    t.error(err)
    db.get(0, function (err, buf) {
      t.error(err)
      t.same(buf, new Buffer('hej verden'))
      db.get(1, function (err, buf) {
        t.error(err)
        t.same(buf, new Buffer('helloworld'))
        t.end()
      })
    })
  })
})

tape('createWriteStream', function (t) {
  var db = fixeddb(tmp(), 10)
  var ws = db.createWriteStream()

  ws.write('hej verden')
  ws.write('helloworld')
  ws.end(function () {
    db.get(1, function (err, buf) {
      t.error(err)
      t.same(buf, new Buffer('helloworld'))
      t.end()
    })
  })
})

tape('createReadStream', function (t) {
  var db = fixeddb(tmp(), 10)
  var ws = db.createWriteStream()

  ws.write('hej verden')
  ws.write('helloworld')
  ws.end(function () {
    var rs = db.createReadStream()
    var expected = [new Buffer('hej verden'), new Buffer('helloworld')]

    rs.on('data', function (data) {
      t.same(data, expected.shift())
    })

    rs.on('end', function () {
      t.same(expected.length, 0)
      t.end()
    })
  })
})

tape('createReadStream gte', function (t) {
  var db = fixeddb(tmp(), 10)
  var ws = db.createWriteStream()

  ws.write('hej verden')
  ws.write('helloworld')
  ws.end(function () {
    var rs = db.createReadStream({gte: 1})
    var expected = [new Buffer('helloworld')]

    rs.on('data', function (data) {
      t.same(data, expected.shift())
    })

    rs.on('end', function () {
      t.same(expected.length, 0)
      t.end()
    })
  })
})
