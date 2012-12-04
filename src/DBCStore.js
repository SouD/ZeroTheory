/**
 * something something documentation.
 */

ZeroTheory.SpellStore = function() {
	this._loadCount = 0;
	this._spellEntryStore = {};
	this._spellDurationStore = {};
	this._spellCastingTimeStore = {};
	this.loaded = false;
	
	ZeroTheory.SpellStore._load(this);
}

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

ZeroTheory.SpellStore._fileLoadComplete = function(store) {
	store._loadCount += 1;
	if (store._loadCount >= 3) {
		store.loaded = true;
		$('#run').attr('disabled', false).css({
			color: '#111111',
		}); //Enable run button
	}
}

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

ZeroTheory.SpellStore.prototype._remapRecord = function(record, keys) {
	var res = {};
	for (var k in keys) {
		res[k] = record[keys[k]];
	}
	return res;
}

ZeroTheory.SpellStore.prototype.getDuration = function(spellEntry) {
	return this.lookupDuration(spellEntry.durationIndex);
}

ZeroTheory.SpellStore.prototype.getCastingTime = function(spellEntry) {
	return this.lookupCastingTime(spellEntry.castingTimeIndex);
}

var spellStore = new ZeroTheory.SpellStore();

