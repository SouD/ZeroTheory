/**
 * @version 1.0
 * @author SouD
 *
 * Class representing a castable spell.
 */

/**
 * Class representing a unit in simulations. Argument 2 and 3
 * are currently not used but are there for possible future
 * implementation of trigger system.
 *
 * @constructor Spell
 * @param {object} spellEntry Spell entry information
 * @param {boolean} triggered Is triggered spell
 * @param {object} triggeredBy Triggering spell entry information
 */
ZeroTheory.Spell = function(spellEntry, triggered, triggeredBy) {
	this.spellInfo = spellEntry;
	this.triggeredBySpellInfo = triggeredBy ? triggeredBy : null;
	this.schoolMask = SpellSchoolMask.getSchoolMask(spellEntry.school);
	
	this.currentBasePoints = [];
	for (var i = 0; i < ZeroTheory.MAX_EFFECT_INDEX; i++) {
		this.currentBasePoints[i] = ZeroTheory.Spell.calculateSimpleValue(spellEntry, i + 1);
	}
	
	this.triggeredSpell = triggered ? triggered : false;
	this.results = {
		damage: 0,
		directDamage: 0,
		dotDamage: 0,
		healing: 0,
		hitResult: 0,
		critResult: 0,
		resist: 0,
		procs: 0
	};
	this.ready = false;
}

/**
 * Calculates a simple value for a spell's effect.
 *
 * @param {object} spellEntry Spell entry information
 * @param {number} effIndex Index of effect to calculate value for
 */
ZeroTheory.Spell.calculateSimpleValue = function(spellEntry, effIndex) {
	return spellEntry['effectBasePoints' + effIndex] + spellEntry['effectBaseDice' + effIndex];
}

/**
 * Calculates the default coefficient for the given spell.
 * Generic support only for casted direct spells.
 *
 * @param {object} spellEntry Spell entry information
 * @param {DamageEffectType} dmgType Damage type
 * @return {number} The calculated coefficient
 */
ZeroTheory.Spell.calculateDefaultCoefficient = function(spellEntry, dmgType) {
	var dotFactor = 1;
	var coeff = 0;
	//Lazy implementation of coefficients, cba to do MangosZero b/c effectAmplitude1-3
	switch (spellEntry.spellIconID) {
		case 31: //Immolate
			var dur = spellStore.getDuration(spellEntry).duration;
			var ct = spellStore.getCastingTime(spellEntry).base;
			var dotPortion = (dur / 15000) / ((dur / 15000) + (ct / 3500));
			var directPortion = 1 - dotPortion;
			if (dmgType == DamageEffectType.DOT) {
				dotFactor /= 5; //5 ticks
				ZeroTheory.Utils.console('log', 'Immolate dot dmg coeff: %d', ((dur / 15000) * dotPortion) * dotFactor);
				//       15  /  15        ~0.63          0.2    = 1*0.63*(1/5) =~ 0.127
				return ((dur / 15000) * dotPortion) * dotFactor;
			}
			else {
				coeff = (ct / 3500) * directPortion;
				ZeroTheory.Utils.console('log', 'Immolate school dmg coeff: %d', coeff);
				return coeff;
			}
				
		case 91: //Curse of Doom
			ZeroTheory.Utils.console('log', 'CoD coeff: %d', 2.0);
			return 2.0; //Easy peasy
				
		case 152: //Siphon Life
			coeff = spellStore.getDuration(spellEntry).duration / 15000.0;
			dotFactor /= 10;
			coeff *= dotFactor;
			ZeroTheory.Utils.console('log', 'SL coeff: %d', ((coeff * dotFactor)/2));
			return coeff / 2; //Halve coeff for drain spells (Works out to 1 as it should)
		
		case 313: //Corruption
			coeff = spellStore.getDuration(spellEntry).duration / 15000.0;
			dotFactor /= 6;
			ZeroTheory.Utils.console('log', 'Corr coeff: %d', (coeff * dotFactor));
			return coeff * dotFactor;
				
		case 544: //Curse of Agony
			ZeroTheory.Utils.console('log', 'CoA coeff: %d', 0.12);
			return 0.12;
		
		default:
			var ct = spellStore.getCastingTime(spellEntry).base;
			ZeroTheory.Utils.console('log', 'Calculating default coeff with ctime: %i', ct);
			ct = ct < 1500 ? 1500 : ct;
			ct /= 1000;
			coeff = ct / 3.5;
			return coeff < 2.0 ? coeff : 2.0; //200% max coeff
	}
}

/**
 * Sets the ready state of the spell to false, resetting
 * the results holder.
 */
ZeroTheory.Spell.prototype.reset = function() {
	this.ready = false;
}

/**
 * Prepares the spell for casting by looking up duration
 * and casting time.
 *
 * @param {Unit} caster The spells caster
 */
ZeroTheory.Spell.prototype.prepare = function(caster) {
	this.caster = caster;
	this.castTimeInfo = spellStore.lookupCastingTime(this.spellInfo.castingTimeIndex);
	this.durationInfo = spellStore.lookupDuration(this.spellInfo.durationIndex);
	this.ready = true;
}

/**
 * Cast {@code this} spell.
 *
 * @param {Unit} caster Caster of the spell
 * @param {Unit} victim Victim of the spell
 */
ZeroTheory.Spell.prototype.cast = function(caster, victim) {
	if (!this.ready) {
		this.prepare(caster);
	}
	
	this.results.hitResult = 0;
	this.results.critResult = 0;
	this.results.damage = 0;
	this.results.resist = 0;
	this.results.healing = 0;
	
	this.results.hitResult = this.caster.spellHitResult(victim, this.spellInfo);
	ZeroTheory.Utils.console('log', 'Hit result: %s', (this.results.hitResult == SpellMissInfo.SPELL_MISS_NONE) ? 'SPELL_MISS_NONE' : 'SPELL_MISS_RESIST');
	switch (this.results.hitResult) {
		case SpellMissInfo.SPELL_MISS_NONE:
			this.doAllEffectOnTarget(victim);
			break;
	}
}

/**
 * Process all spell effects on the supplied target.
 * Supports the following effects:
 *     SPELL_EFFECT_SCHOOL_DAMAGE
 *     SPELL_EFFECT_APPLY_AURA
 *
 * @param {Unit} victim Unit to process effects on
 */
ZeroTheory.Spell.prototype.doAllEffectOnTarget = function(victim) {
	if (!this.ready) {
		this.prepare(victim);
	}
	
	ZeroTheory.Utils.console('log', 'Processing effects for target: %o', victim);
	for (var i = 1; i <= ZeroTheory.MAX_EFFECT_INDEX; i++) {
		if (this.spellInfo['effect' + i] == 0) {
			continue;
		}
		
		ZeroTheory.Utils.console('log', 'Processing effect no: %i', i);
		
		switch (this.spellInfo['effect' + i]) {
			case SpellEffects.SPELL_EFFECT_SCHOOL_DAMAGE:
				this._handleEffectSchoolDamage(i, victim);
				break;
			
			case SpellEffects.SPELL_EFFECT_APPLY_AURA:
				this._handleEffectApplyAura(i, victim);
				break;
		}
	}
}

/**
 * Calulates spell base damage.
 * 
 * @param {number} effectIndex Index of spell effect
 * @param {Unit} victim Victim of effect
 */
ZeroTheory.Spell.prototype.calculateDamage = function(effectIndex, victim) {
	return this.caster.calculateBaseDamage(victim, this.spellInfo, effectIndex, this.currentBasePoints[effectIndex - 1]);
}

/**
 * Calculates spell damage done and resists.
 *
 * @param {number} effectIndex Index of effect
 * @param {Unit} victim Victim of effect
 */
ZeroTheory.Spell.prototype.calculateSpellDamage = function(effectIndex, victim) {
	var tmpDamage = this.caster.calculateSpellDamage(victim, this.spellInfo, this.results.directDamage, this.results);
	tmpDamage = victim.calculateResist(this.caster, this.spellInfo.school, tmpDamage, DamageEffectType.SPELL_DIRECT_DAMAGE, this.results);
	return tmpDamage > 0 ? tmpDamage : 0;
}

/**
 * Handler method for effect:
 *     SPELL_EFFECT_SCHOOL_DAMAGE
 *
 * @param {number} effectIndex Index of effect
 * @param {Unit} victim Victim of effect
 */
ZeroTheory.Spell.prototype._handleEffectSchoolDamage = function(effectIndex, victim) {
	this.results.directDamage = this.calculateDamage(effectIndex, victim);
	this.results.directDamage = this.calculateSpellDamage(effectIndex, victim);
	ZeroTheory.Utils.console('log', 'Final school damage: %i', this.results.directDamage);
}

/**
 * Handler method for effect:
 *     SPELL_EFFECT_APPLY_AURA
 *
 * @param {number} effectIndex Index of effect
 * @param {Unit} victim Victim of effect
 */
ZeroTheory.Spell.prototype._handleEffectApplyAura = function(effectIndex, victim) {
	victim.spellAuraList.push(new ZeroTheory.Aura(this.caster, victim, this, effectIndex));
}
