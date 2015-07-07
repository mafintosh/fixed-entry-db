var fs = require('fs')
var thunky = require('thunky')
var from = require('from2')
var bulk = require('bulk-write-stream')

module.exports = DB

function DB (filename, entrySize) {
  if (!(this instanceof DB)) return new DB(filename, entrySize)
  if (!filename) throw new Error('filename is required')
  if (!entrySize) throw new Error('entry size is required')

  var self = this

  this.filename = filename
  this.entrySize = entrySize
  this.fd = 0
  this.size = 0
  this.entries = 0

  this.buffer = null
  this.callbacks = null
  this.open = thunky(function (cb) {
    fs.open(filename, 'a+', function (err, fd) {
      if (err) return cb(err)
      fs.fstat(fd, function (err, st) {
        if (err) return cb(err)
        self.fd = fd
        self.size = st.size - (st.size % entrySize)
        self.entries = self.size / entrySize
        cb()
      })
    })
  })
}

DB.prototype.createWriteStream = function () {
  var self = this
  return bulk(function (list, cb) {
    self.append(Buffer.concat(list), cb)
  })
}

DB.prototype.createReadStream = function (opts) {
  if (!opts) opts = {}

  var self = this
  var offset = 0

  if (typeof opts.gt === 'number') offset = (opts.gt + 1) * this.entrySize
  if (typeof opts.gte === 'number') offset = opts.gte * this.entrySize

  var stream = from(function (size, cb) {
    var bufSize = Math.ceil(size / self.entrySize) * self.entrySize
    self.open(function (err) {
      if (err) return cb(err)

      var buf = new Buffer(bufSize)
      readAll(self.fd, offset, buf, function (err, missing) {
        if (err) return cb(err)

        var read = buf.length - missing
        for (var i = 0; i < read; i += self.entrySize) {
          var end = i + self.entrySize
          if (end <= read) stream.push(buf.slice(i, end))
        }

        offset += bufSize

        if (missing) cb(null, null)
        else cb()
      })
    })
  })

  return stream
}

DB.prototype.get = function (index, cb) {
  var offset = index * this.entrySize
  var buf = new Buffer(this.entrySize)
  var self = this

  this.open(function (err) {
    if (err) return cb(err)
    if (offset >= self.size) return cb(null, null)
    readAll(self.fd, offset, buf, function (err) {
      if (err) return cb(err)
      cb(null, buf)
    })
  })
}

DB.prototype.put = function (index, buf, cb) {
  if (!cb) cb = noop
  if (typeof buf === 'string') buf = new Buffer(buf)
  if (buf.length % this.entrySize !== 0) throw new Error('Entry must be ' + this.entrySize + ' bytes')

  var missing = buf.length
  var offset = index * this.entrySize
  var self = this

  this.open(write)

  function write (err) {
    if (err) return cb(err)
    if (offset > self.size) return cb(new Error('Write is out of bounds'))
    fs.write(self.fd, buf, buf.length - missing, missing, offset, done)
  }

  function done (err, written) {
    if (err) return cb(err)
    missing -= written
    offset += written
    if (!missing) {
      if (offset > self.size) {
        self.size = offset
        self.entries = self.size / self.entrySize
      }
      return cb(null)
    }
    write(null)
  }
}

DB.prototype.append = function (buf, cb) {
  if (!cb) cb = noop
  if (typeof buf === 'string') buf = new Buffer(buf)

  var self = this
  this.open(function (err) {
    if (err) return cb(err)

    if (self.buffer) {
      self.buffer.push(buf)
      self.callbacks.push(cb)
      return
    }

    self.buffer = []
    self.callbacks = []
    self.put(self.entries, buf, drain)
  })

  function drain (err) {
    if (err) return cb(err)

    var buf = self.buffer.length ? Buffer.concat(self.buffer) : null
    var next = self.callbacks ? callAll(self.callbacks) : null

    self.buffer = null
    self.callbacks = null

    if (!buf) return cb()
    self.append(buf, next)
    cb()
  }
}

DB.prototype.close = function (cb) {
  if (!cb) cb = noop
  var self = this
  this.open(function (err) {
    if (err) return cb(err)
    fs.close(self.fd, cb)
  })
}

DB.prototype.flush = function (cb) {
  if (!cb) cb = noop
  var self = this
  this.open(function (err) {
    if (err) return cb(err)
    fs.fsync(self.fd, cb)
  })
}

function noop () {}

function callAll (list) {
  return function (err) {
    for (var i = 0; i < list.length; i++) list[i](err)
  }
}

function readAll (fd, offset, buf, cb) {
  var missing = buf.length
  fs.read(fd, buf, 0, missing, offset, loop)

  function loop (err, read) {
    if (err) return cb(err)
    missing -= read
    offset += read
    if (!missing || !read) return cb(null, missing)
    fs.read(fd, buf, buf.length - missing, missing, offset, loop)
  }
}
