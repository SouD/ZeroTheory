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
 * @constructor SpellStore
 */
ZeroTheory.SpellStore = function() {
	this._loadCount = 0;
	this._spellEntryStore = {};
	this._spellDurationStore = {};
	this._spellCastingTimeStore = {};
	this.loaded = false;
	
	ZeroTheory.SpellStore._load(this);
}

/**
 * Loads the store with the dbc files needed.
 * Currently loads:
 *     Spell.json
 *     SpellCastTimes.json
 *     SpellDuration.json
 *
 * @param {SpellStore} store The store to load
 */
ZeroTheory.SpellStore._load = function(store) {
	ZeroTheory.Utils.console('log', 'SpellStore loading ..');
	
	$.getJSON(ZeroTheory.DBC_PATH + 'Spell.json', function(data) {
		//Create index map from data.fields
		var i = 0;
		data.fieldIndex = {};
		for (var k in data.fields) {
			data.fieldIndex[k] = i;
			i++;
		}
		data.fields = null;
		
		store._spellEntryStore = data;
		ZeroTheory.SpellStore._fileLoadComplete(store);
		
		ZeroTheory.Utils.console('log', 'FILE: ./' + ZeroTheory.DBC_PATH + 'Spell.json;\t\tSTATUS: complete;');
	});
	
	$.getJSON(ZeroTheory.DBC_PATH + 'SpellDuration.json', function(data) {
		//Create index map from data.fields
		var i = 0;
		data.fieldIndex = {};
		for (var k in data.fields) {
			data.fieldIndex[k] = i;
			i++;
		}
		data.fields = null;
		
		store._spellDurationStore = data;
		ZeroTheory.SpellStore._fileLoadComplete(store);
		
		ZeroTheory.Utils.console('log', 'FILE: ./' + ZeroTheory.DBC_PATH + 'SpellDuration.json;\tSTATUS: complete;');
	});
	
	$.getJSON(ZeroTheory.DBC_PATH + 'SpellCastTimes.json', function(data) {
		//Create index map from data.fields
		var i = 0;
		data.fieldIndex = {};
		for (var k in data.fields) {
			data.fieldIndex[k] = i;
			i++;
		}
		data.fields = null;
		
		store._spellCastingTimeStore = data;
		ZeroTheory.SpellStore._fileLoadComplete(store);
		
		ZeroTheory.Utils.console('log', 'FILE: ./' + ZeroTheory.DBC_PATH + 'SpellCastTimes.json;\tSTATUS: complete;');
	});
}

/**
 * Callback function used in conjunction with
 * SpellStore._load
 *
 * @param {SpellStore} store Store that was loaded with a dbc file
 */
ZeroTheory.SpellStore._fileLoadComplete = function(store) {
	store._loadCount += 1;
	if (store._loadCount >= 3) {
		store.loaded = true;
		$('#run').attr('disabled', false).css({
			color: '#111111'
		}); //Enable run button
	}
}

/**
 * Looks up a spell entry based on input id.
 *
 * @param {number} id Spell id to search by
 */
ZeroTheory.SpellStore.prototype.lookupEntry = function(id) {
	if (!this.loaded || !id) {
		return null;
	}
	
	for (var i = 0; i < this._spellEntryStore.records.length; i++) {
		if (this._spellEntryStore.records[i][this._spellEntryStore.fieldIndex.ID] == id) {
			return this._remapRecord(this._spellEntryStore.records[i], this._spellEntryStore.fieldIndex);
		}
	}
	return null;
}

/**
 * Looks up a spell duration entry based on input id.
 *
 * @param {number} id Duration entry id to search by
 */
ZeroTheory.SpellStore.prototype.lookupDuration = function(id) {
	if (!this.loaded || !id) {
		return null;
	}
	
	for (var i = 0; i < this._spellDurationStore.records.length; i++) {
		if (this._spellDurationStore.records[i][this._spellDurationStore.fieldIndex.ID] == id) {
			return this._remapRecord(this._spellDurationStore.records[i], this._spellDurationStore.fieldIndex);
		}
	}
	return null;
}

/**
 * Looks up a spell casting time entry based on input id.
 *
 * @param {number} id Casting time entry id to search by
 */
ZeroTheory.SpellStore.prototype.lookupCastingTime = function(id) {
	if (!this.loaded || !id) {
		return null;
	}
	
	for (var i = 0; i < this._spellCastingTimeStore.records.length; i++) {
		if (this._spellCastingTimeStore.records[i][this._spellCastingTimeStore.fieldIndex.ID] == id) {
			return this._remapRecord(this._spellCastingTimeStore.records[i], this._spellCastingTimeStore.fieldIndex);
		}
	}
	return null;
}

/**
 * Remaps the input record to the input set of keys.
 *
 * @param {object} record Record to remap
 * @param {object} keys New set of keys to use
 */
ZeroTheory.SpellStore.prototype._remapRecord = function(record, keys) {
	var res = {};
	for (var k in keys) {
		res[k] = record[keys[k]];
	}
	return res;
}

/**
 * Gets the duration entry for the supplied spell entry
 * if it exists.
 * 
 * @param {object} spellEntry Spell entry information
 */
ZeroTheory.SpellStore.prototype.getDuration = function(spellEntry) {
	return this.lookupDuration(spellEntry.durationIndex);
}

/**
 * Gets the casting time entry for the supplied spell entry
 * if it exists.
 * 
 * @param {object} spellEntry Spell entry information
 */
ZeroTheory.SpellStore.prototype.getCastingTime = function(spellEntry) {
	return this.lookupCastingTime(spellEntry.castingTimeIndex);
}

//Create a global spellStore
var spellStore = new ZeroTheory.SpellStore();

