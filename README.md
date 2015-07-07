# fixed-entry-db

A flat file append-only database that uses fixed size entries

```
npm install fixed-entry-db
```

## Usage

``` js
var fixeddb = require('fixed-entry-db')
var db = fixeddb('./database.db', 5) // entries are 5 bytes

db.append(new Buffer('hello'))
db.append(new Buffer('world'), function () {
  db.get(0, console.log) // prints hello
  db.get(1, console.log) // prints world
})
```

## API

#### `db = fixeddb(filename, entrySize)`

Instantiate a new database. All entries stored
*must* be `entrySize` large.

#### `db.append(buf, [cb])`

Append a new entry.

#### `db.get(index, cb)`

Get a entry at a specific index.

#### `db.put(index, buf, [cb])`

Override an old entry.

#### `stream = db.createWriteStream()`

Create a write stream that appends all entries
written to the stream to the database.

#### `stream = db.createReadStream([opts])`

Create a read stream of all entries in the database.
Optionally you can pass `gt: index` or `gte: index` to the options
map to only read entries after a specific index.

#### `db.close([cb])`

Close the database.

#### `db.flush([cb])`

Flush the database. Performs a fsync on the file to make
sure all changes are flushed to disk.

#### `db.open([cb])`

Force open the database. The database is opened lazily when
you perform an operation. After the database has been opened
`db.entries` should be set to the number of entries in the database
and `db.size` should be set to the total ondisk size of the database

## License

MIT
