/**
 * @version 1.0
 * @author SouD
 *
 * Handles loading and querying of the json
 * dbc files.
 */

/**
 * Class representing a spell storage. Provides necessary
 * querying and loading methods.
 *
 * @constructor DBCStore
 */
var DBCStore = function () {
    this.loaded = false;
    this.dbc = null;
    this.fieldIndex = {};
    this.idIndex = {};
};

/**
 * Loads the store with the dbc file needed.
 */
DBCStore.prototype.load = function (dbc) {
    if (!this.loaded) {
        if (dbc) {
            this.dbc = dbc;
            this.loaded = true;

            this.buildIndices();
        }
    }
};

/**
 * Build DBC indices.
 */
DBCStore.prototype.buildIndices = function () {
    if (this.loaded && this.dbc) {
        var i = 0;
        for (var key in this.dbc.fields) {
            this.fieldIndex[key] = i;
            ++i;
        }

        this.dbc.fields = null; // Remove fieldnames from dbc

        var id = null;
        for (i = 0; i < this.dbc.records.length; ++i) {
            id = this.dbc.records[i][this.fieldIndex.ID];
            this.idIndex[id] = i;
        }
    }
};

/**
 * Looks up a spell entry based on input id.
 *
 * @param {number} id Spell id to search by.
 */
DBCStore.prototype.lookupEntry = function (id) {
    if (!this.loaded || !id) {
        return null;
    }

    var i = this.idIndex[id];

    if (i) {
        return this._remapRecord(this.dbc.records[i], this.fieldIndex);
    }

    return null;
};

/**
 * Remaps the input record to the input set of keys.
 *
 * @param {object} record Record to remap.
 * @param {object} keys New set of keys to use.
 */
DBCStore.prototype._remapRecord = function (record, keys) {
    var res = {};

    for (var k in keys) {
        res[k] = record[keys[k]];
    }

    return res;
};
