const path = require('path');
const Datastore = require('nedb');

module.exports = (directory) => {
  const db = new Datastore({ filename: path.join(directory, 'pulchra'), autoload: true });

  const _store = (index, url) => new Promise((resolve, reject) => {
    db.insert({ index, url }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  const _retrieve = index => new Promise((resolve, reject) => {
    db.findOne({ index }, (err, doc) => {
      if (err) return reject(err);
      resolve(doc.url);
    });
  });

  return {
    store: _store,
    retrieve: _retrieve,
  };
};
