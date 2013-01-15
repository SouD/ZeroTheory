/**
 * @version 1.0
 * @author SouD
 *
 * Notes:
 *    Look into optimizing loops.
 *    Lots of redundant code to remove.
 *    Add "Improve Curse of Agony" support.
 */

ZeroTheory.showAlert = true;
var zt;

$(document).ready(function() {
	zt = new ZeroTheory.ZeroTheory();
	
	//First, bind some DOMElements
	$('.stat_input[id!="time"]').blur(function() {
		var v = $(this).val();
		var k = $(this).attr('id');
		if (v) {
			v = parseInt(v, 10);
			if (!isNaN(v)) {
				zt.caster.stats[k] = Math.abs(v);
				ZeroTheory.Utils.console('log', 'Set zt.caster.stats.%s to %i', k, v);
			}
			else if (ZeroTheory.showAlert) {
				$(this).val('');
				alert('Input must be a number!');
			}
			else {
				$(this).val('');
			}
		}
		else {
			zt.caster.stats[k] = 0;
			ZeroTheory.Utils.console('log', 'Set zt.caster.stats.%s to %i', k, 0);
			$(this).val('');
		}
	});
	
	$('.stat_input[id="time"]').blur(function() {
		var v = $(this).val();
		if (v) {
			v = parseInt(v, 10);
			if (!isNaN(v)) {
				zt.simVars.time = Math.abs(v);
				ZeroTheory.Utils.console('log', 'Set zt.simVars.time to %i', v);
			}
			else if (ZeroTheory.showAlert) {
				$(this).val('');
				alert('Input must be a number!');
			}
			else {
				$(this).val('');
			}
		}
		else {
			zt.simVars.time = ZeroTheory.DEFAULT_RUNTIME;
			ZeroTheory.Utils.console('log', 'Set zt.simVars.time to %i', ZeroTheory.DEFAULT_RUNTIME);
			$(this).val('');
		}
	});
	
	$('.spell_input').change(function() {
		var checked = $(this).attr('checked');
		var k = $(this).attr('id');
		
		//Toggle rank selection and set value
		if (checked) {
			$('select[name="' + k + 'Rank"]').attr('disabled', false);
		}
		else {
			$('select[name="' + k + 'Rank"]').attr('disabled', true);
		}
		zt.spellInfo[k] = checked; //Set value
		ZeroTheory.Utils.console('log', 'Set zt.spellInfo.%s to %i', k, !!checked);
		
		//Force lose focus
		$(this).blur();
	});
	
	$('select').change(function() {
		var k = $(this).attr('name');
		var v = $(this).find('option:selected').val();
		
		zt.spellInfo[k] = parseInt(v, 10);
		ZeroTheory.Utils.console('log', 'Set zt.spellInfo.%s to %i', k, v);
		
		//Force lose focus
		$(this).blur();
	});
	
	//Make results movable
	var dm = document.getElementById('data_overlay');
	dm.addEventListener('dragstart', drag_start, false);
	document.body.addEventListener('dragover', drag_over, false);
	document.body.addEventListener('drop', drop, false);
	
	//Then hide em'
	$('#data_overlay').hide();
});

/*
 * Functions handling drag and drop for results element:
 *     drag_start
 *     drag_over
 *     drop
 */
function drag_start(event) {
	var style = window.getComputedStyle(event.target, null);
    event.dataTransfer.setData("text/plain",
    (parseInt(style.getPropertyValue("left"),10) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top"),10) - event.clientY));
}
function drag_over(event) {
	event.preventDefault();
    return false; 
}
function drop(event) {
	var offset = event.dataTransfer.getData("text/plain").split(',');
    var dm = document.getElementById('data_overlay');
    dm.style.left = (event.clientX + parseInt(offset[0],10)) + 'px';
    dm.style.top = (event.clientY + parseInt(offset[1],10)) + 'px';
    event.preventDefault();
    return false;
}

/**
 * Holds the caster and the target (boss) and some
 * simulation variables.
 *
 * @constructor ZeroTheory
 */
ZeroTheory.ZeroTheory = function() {
	this.caster = new ZeroTheory.Unit(60);
	this.target = new ZeroTheory.Unit(63);
	
	//Keys match html ids
	this.spellInfo = {
		specc: ZeroTheory.SM_RUIN,
		curse: 17937,
		useCorr: true,
		useCorrRank: 11672,
		useSB: true,
		useSBRank: 11661,
		useImmo: false,
		useImmoRank: 11668,
		useSL: false,
		useSLRank: 18881
	};
	
	//Key 'time' match html id
	this.simVars = {
		time: ZeroTheory.DEFAULT_RUNTIME, //Default 15 minutes
		run: false
	};
}

/**
 * Prepares the caster by applying talent auras.
 */
ZeroTheory.ZeroTheory.prototype.prepareTalents = function() {
	ZeroTheory.activeSpecc = this.spellInfo.specc;
	var sm = new ZeroTheory.Spell(spellStore.lookupEntry(18275)); //Shadow Mastery
	var ds = new ZeroTheory.Spell(spellStore.lookupEntry(18791)); //Touch of Shadow
	
	switch (ZeroTheory.activeSpecc) {
		case ZeroTheory.SM_RUIN:
			if (this.caster.hasSpell(ds.spellInfo)) {
				this.caster.removeAurasBySpell(ds.spellInfo);
			}
			if (!this.caster.hasSpell(sm.spellInfo)) {
				this.caster.castSpellOnSelf(sm);
			}
			break;
		
		case ZeroTheory.DS_RUIN_CORR:
		case ZeroTheory.DS_RUIN_SUPP:
			if (this.caster.hasSpell(sm.spellInfo)) {
				this.caster.removeAurasBySpell(sm.spellInfo);
			}
			if (!this.caster.hasSpell(ds.spellInfo)) {
				ds.prepare(this.caster);
				
				//Modify duration to prevent ds falling of
				ds.durationInfo.maxDuration = 0;
				ds.durationInfo.duration = 0;
				
				this.caster.castSpellOnSelf(ds);
			}
			break;
	}
}

/**
 * Attempt to calculate stat weightings based on the 
 * simulation results.
 *
 * @param {object} r Simulation results
 */
ZeroTheory.ZeroTheory.prototype.calculateStatWeightings = function(r) {
	var secs = this.simVars.time / 1000;
	
	//Weight sp and create standard
	var avgHit = r.totals.damage / r.totals.hits;
	
	var sp = 10; //On average worth 3.5-4 dps
	var epHit = avgHit + sp; //Should possibly scale down by coeffs?
	var epDps = (epHit * r.totals.hits) / secs;
	var ep = epDps - r.totals.dps;
	
	//Weight of 1 +hit against ep
	var hitWeight = 0;
	if (this.caster.stats.spellHitPct < 16) { //Weight is 0 at max +hit
		var eh = (r.totals.hits * 1.01) - r.totals.hits; //Extra hits
		eh = eh * avgHit; //Extra hit damage
		eh = (r.totals.damage + eh) / secs; //Extra hit dps
		eh = eh - r.totals.dps; //Extra hit diff
		hitWeight = eh / ep;
	}
	
	//Weight of 1 + crit against ep
	var critWeight = 0;
	var ec = (r.totals.crits * 1.01) - r.totals.crits; //Extra crits
	ec = ec * (avgHit * 2.0); //Extra crit damage
	ec = (r.totals.damage + ec) / secs; //Extra crit dps
	ec = ec - r.totals.dps; //Extra crit diff
	critWeight = ec / ep;
	
	return {
		epValue: ep,
		spToEp: sp,
		hitw: hitWeight,
		critw: critWeight
	};
}

/**
 * Resets caster and target auras.
 */
ZeroTheory.ZeroTheory.prototype.resetAuras = function() {
	this.caster.spellAuraList = [];
	this.target.spellAuraList = [];
}

/**
 * Runs the simulation.
 */
ZeroTheory.ZeroTheory.prototype.run = function() {
	this.resetAuras();
	this.prepareTalents();
	var lockTimer = 0;
	var timer = this.simVars.time;
	
	//Build rotation: Curse -> [Dots] -> Shadow Bolt
	var rotation = [];
	var spellResults = [];
	rotation.push(new ZeroTheory.Spell(spellStore.lookupEntry(this.spellInfo.curse)));
	spellResults.push({
		totalDamage: 0,
		hits: 0,
		crits: 0,
		resists: 0,
		partialResistedDamage: 0,
		timeSpentCasting: 0,
		uptime: 0
	});
	if (this.spellInfo.useCorr) { //Corruption
		rotation.push(new ZeroTheory.Spell(spellStore.lookupEntry(this.spellInfo.useCorrRank)));
		rotation[rotation.length - 1].prepare(this.caster);
		if (ZeroTheory.activeSpecc == ZeroTheory.SM_RUIN || ZeroTheory.activeSpecc == ZeroTheory.DS_RUIN_CORR) {
			rotation[rotation.length - 1].castTimeInfo.base = 0;
		}
		spellResults.push({
			totalDamage: 0,
			hits: 0,
			crits: 0,
			resists: 0,
			partialResistedDamage: 0,
			timeSpentCasting: 0,
			uptime: 0
		});
	}
	if (this.spellInfo.useImmo) { //Immolate
		rotation.push(new ZeroTheory.Spell(spellStore.lookupEntry(this.spellInfo.useImmoRank)));
		spellResults.push({
			totalDamage: 0,
			hits: 0,
			crits: 0,
			resists: 0,
			partialResistedDamage: 0,
			timeSpentCasting: 0,
			uptime: 0
		});
	}
	if (this.spellInfo.useSL) { //Siphon Life
		rotation.push(new ZeroTheory.Spell(spellStore.lookupEntry(this.spellInfo.useSLRank)));
		spellResults.push({
			totalDamage: 0,
			hits: 0,
			crits: 0,
			resists: 0,
			partialResistedDamage: 0,
			timeSpentCasting: 0,
			uptime: 0
		});
	}
	//Shadow Bolt
	rotation.push(new ZeroTheory.Spell(spellStore.lookupEntry(this.spellInfo.useSBRank)));
	rotation[rotation.length - 1].prepare(this.caster);
	rotation[rotation.length - 1].castTimeInfo.base = 2500;
	spellResults.push({
		totalDamage: 0,
		hits: 0,
		crits: 0,
		crits: 0,
		resists: 0,
		partialResistedDamage: 0,
		timeSpentCasting: 0
	});
	
	var elapsed = 0;
	while (timer >= 0) { //Main sim loop
		lockTimer = lockTimer > 0 ? lockTimer - elapsed : 0;
		this.caster.update(elapsed);
		this.target.update(elapsed);
		
		if (lockTimer <= 0) { //Not casting, pick something to cast
			for (var i = 0; i < (rotation.length - 1); i++) { //Loop rotation table to see what needs casting
				if (!this.target.hasSpell(rotation[i].spellInfo)) {
					this.caster.cast(rotation[i], this.target);
					
					if (rotation[i].results.hitResult == SpellMissInfo.SPELL_MISS_NONE) {
						spellResults[i].hits += 1;
						if (rotation[i].results.critResult == SpellHitType.SPELL_HIT_TYPE_CRIT) {
							spellResults[i].crits += 1;
						}
						spellResults[i].totalDamage += rotation[i].results.directDamage;
						spellResults[i].partialResistedDamage += rotation[i].results.resist;
					}
					else {
						spellResults[i].resists += 1;
					}
					
					var gcd = rotation[i].spellInfo.startRecoveryTime;
					var ct = rotation[i].castTimeInfo.base;
					lockTimer = ct >= gcd ? ct : gcd;
					spellResults[i].timeSpentCasting += lockTimer;
					break;
				}
			}
			
			if (lockTimer <= 0) { //No other spells cast, cast SB
				var sb = rotation.length - 1; //SB is always last index
				this.caster.cast(rotation[sb], this.target);
				
				if (rotation[sb].results.hitResult == SpellMissInfo.SPELL_MISS_NONE) {
					spellResults[sb].hits += 1;
					if (rotation[sb].results.critResult == SpellHitType.SPELL_HIT_TYPE_CRIT) {
						spellResults[sb].crits += 1;
					}
					spellResults[sb].totalDamage += rotation[sb].results.directDamage;
					spellResults[sb].partialResistedDamage += rotation[sb].results.resist;
				}
				else {
					spellResults[sb].resists += 1;
				}
				
				var gcd = rotation[sb].spellInfo.startRecoveryTime;
				var ct = rotation[sb].castTimeInfo.base;
				
				var nf = spellStore.lookupEntry(17941);
				if (this.caster.hasSpell(nf)) {
					ct = 0;
					this.caster.removeAurasBySpell(nf);
				}
				
				lockTimer = ct >= gcd ? ct : gcd;
				spellResults[sb].timeSpentCasting += lockTimer;
			}
		}
		
		elapsed = 100; //Steps of 100 "msec"
		timer -= elapsed;
	}
	
	//Add some results into spellResults
	for (var i = 0; i < rotation.length; i++) {
		spellResults[i].totalDamage += rotation[i].results.dotDamage;
		spellResults[i].procs = rotation[i].results.procs;
		var durInfo = rotation[i].durationInfo;
		if (durInfo) {
			spellResults[i].uptime = durInfo.duration * spellResults[i].hits;
		}
	}
	
	var total = {
		damage: 0,
		hits: 0,
		crits: 0,
		resists: 0,
		partiallyResisted: 0,
		activeTime: 0,
		dps: 0,
		procs: 0
	};
	
	for (var i = 0; i < spellResults.length; i++) {
		total.damage += spellResults[i].totalDamage;
		total.hits += spellResults[i].hits;
		total.crits += spellResults[i].crits;
		total.resists += spellResults[i].resists;
		total.partiallyResisted += spellResults[i].partialResistedDamage;
		total.activeTime += spellResults[i].timeSpentCasting;
	}
	total.activeTime = total.activeTime > this.simVars.time ? this.simVars.time : total.activeTime;
	total.activeTime = (total.activeTime / 1000) + 's';
	total.dps = total.damage / (this.simVars.time / 1000);
	
	if (this.spellInfo.useCorr) {
		total.procs = rotation[1].results.procs;
	}
	
	return {
		results: spellResults, 
		totals: total
	};
}

/**
 * Sets debug to false and runs the simulation, then
 * present the results.
 */
function runSim() {
	var startTime = new Date().getTime();
	ZeroTheory.Utils.debug = false; //Don't debug unless you want your browser to lock
	var r1 = zt.run();
	ZeroTheory.Utils.debug = true; //Don't debug unless you want your browser to lock
	var endTime = new Date().getTime();
	var elapsedTime = endTime - startTime;
	ZeroTheory.Utils.console('log', 'Elapsed time: %i msec', elapsedTime);
	presentResults(r1);
}

/**
 * Hides the results element.
 */
function data_overlay_close() {
	$('#data_overlay').hide();
}

/**
 * Shows the results element with values.
 */
function presentResults(results, weightings) {
	for (var key in results.totals) {
		$('#' + key).text(results.totals[key]);
	}
	$('#hits').text(results.totals.hits - results.totals.crits);
	$('#casts').text(results.totals.hits + results.totals.resists);
	$('#data_overlay').fadeIn(200);
}

