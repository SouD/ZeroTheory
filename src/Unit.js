/**
 * something something documentation.
 */

ZeroTheory.Unit = function(lv, resists) {
	this.level = lv;
	this.stats = {
		intellect: 0,
		stamina: 0,
		spellHitPct: 0,
		spellCritPct: 0,
		baseSpellCritPct: 5,
		spellPen: 0,
		sp: 0,
		ssp: 0,
		fsp: 0,
	};
	this.resistance = resists ? resists : [0, 0, 0, 0, 0, 0];
	this.spellAuraList = [];
}

ZeroTheory.Unit.prototype.spellHitResult = function(victim, spellEntry) {
	switch (spellEntry.defenseType) {
		case SpellDmgClass.SPELL_DAMAGE_CLASS_NONE:
			return SpellMissInfo.SPELL_MISS_NONE;
		case SpellDmgClass.SPELL_DAMAGE_CLASS_MAGIC:
			return this.magicSpellHitResult(victim, spellEntry);
		case SpellDmgClass.SPELL_DAMAGE_CLASS_MELEE:
		case SpellDmgClass.SPELL_DAMAGE_CLASS_RANGED:
			return SpellMissInfo.SPELL_MISS_NONE; //Add method if needed in future
	}
	return SpellMissInfo.SPELL_MISS_NONE;
}

ZeroTheory.Unit.prototype.magicSpellHitResult = function(victim, spellEntry) {
	var lchance = 11;
	var ldiff = victim.level - this.level;
	var modHitChance;
	if (ldiff < 3) {
		modHitChance = 96 - ldiff;
	}
	else {
		modHitChance = 94 - (ldiff - 2) * lchance;
	}
	
	ZeroTheory.Utils.console('log', 'modHitChance: %i%', modHitChance);
	
	//Sloppy hack for suppression +hit
	var flatMod = 0;
	if (ZeroTheory.activeSpecc == ZeroTheory.SM_RUIN || ZeroTheory.activeSpecc == ZeroTheory.DS_RUIN_SUPP) {
		switch (spellEntry.spellIconID) {
			case 55:  //Curse of the Elements
			case 91:  //Curse of Doom
			case 152: //Siphon Life
			case 313: //Corruption
			case 542: //Curse of Shadow
			case 544: //Curse of Agony
				flatMod = 10;
				ZeroTheory.Utils.console('log', 'Affliction spell and suppression talent detected, adding 10% +hit');
				break;
		}
	}
	flatMod += this.stats.spellHitPct; //Add +hit from stats
	modHitChance += flatMod;
	ZeroTheory.Utils.console('log', 'Total chance to hit: %i%', modHitChance);
	
	var hitChance = modHitChance * 100;
	if (hitChance < 100) {
		hitChance = 100;
	}
	if (hitChance > 9900) {
		hitChance = 9900;
	}
	
	var tmp = 10000 - hitChance;
	var rand = Math.floor(Math.random() * (10000 + 1));
	ZeroTheory.Utils.console('log', 'Rolled outcome: rand=%i, tmp=%i;', rand, tmp);
	if (rand < tmp) {
		return SpellMissInfo.SPELL_MISS_RESIST;
	}
	
	return SpellMissInfo.SPELL_MISS_NONE;
}

ZeroTheory.Unit.prototype.cast = function(spell, target) {
	spell.cast(this, target);
}

ZeroTheory.Unit.prototype.calculateBaseDamage = function(victim, spellEntry, effectIndex, effBasePoints) {
	var lv = this.level;
	if (lv > spellEntry.maxLevel && spellEntry.maxLevel > 0) {
		lv = spellEntry.maxLevel;
	}
	else if (lv < spellEntry.baseLevel) {
		lv = spellEntry.baseLevel;
	}
	lv -= spellEntry.spellLevel;
	
	var baseDice = spellEntry['effectBaseDice' + effectIndex];
	var basePointsPerLevel = spellEntry['effectRealPointsPerLevel' + effectIndex];
	var randomPointsPerLevel = spellEntry['effectDicePerLevel' + effectIndex];
	var basePoints = effBasePoints ? effBasePoints - baseDice : spellEntry['effectBasePoints' + effectIndex];
	
	basePoints += lv * basePointsPerLevel;
	var randomPoints = spellEntry['effectDieSides' + effectIndex] + lv * randomPointsPerLevel;
	ZeroTheory.Utils.console('log', 'Spell info: spellLevel: %i; spellMaxLevel: %i; spellBaseLevel: %i;', spellEntry.spellLevel, spellEntry.maxLevel, spellEntry.baseLevel);
	ZeroTheory.Utils.console('log', 'baseDice: %i; basePointsPerLevel: %i; randomPointsPerLevel: %i; basePoints: %i; randomPoints: %i;', baseDice, basePointsPerLevel, randomPointsPerLevel, basePoints, randomPoints);
	
	switch (randomPoints) {
		case (randomPoints >= 0):
		case (randomPoints >= 1):
			basePoints += baseDice;
			break;
		
		default:
			//Math.floor(Math.random() * (max - min + 1)) + min;
			var randValue = baseDice >= randomPoints 
				? Math.floor(Math.random() * (baseDice - randomPoints + 1)) + randomPoints 
				: Math.floor(Math.random() * (randomPoints - baseDice + 1)) + baseDice;
			basePoints += randValue;
			break;
	}
	
	var value = basePoints;
	if ((spellEntry.attributes & 0x00080000) && spellEntry.spellLevel && spellEntry['effect' + effectIndex] != SpellEffect.SPELL_EFFECT_APPLY_AURA) {
		value = value * 0.25 * Math.exp(this.level * (70 - spellEntry.spellLevel) / 1000);
	}
	
	ZeroTheory.Utils.console('log', 'Final value of basePoints: %i;', value);
	return value;
}

/*
 * Chain:
 * Spell::doAllEffectOnTarget ->
 *     calculate base damage per effect -> <caster>Unit::CalculateSpellDamage
 *     roll for resists (partials) -> <caster>Unit::CalculateAbsorbResistBlock
 *     apply bonuses with coeffs -> <caster>Unit::SpellDamageBonusWithCoeffs
 *     roll for crit -> <caster>?::isSpellCrit
 *     apply damage to target -> <caster>Unit::DealDamage
 */
ZeroTheory.Unit.prototype.calculateSpellDamage = function(victim, spellEntry, damage, results) {
	var crit = this.isSpellCrit(victim, spellEntry);
	ZeroTheory.Utils.console('log', 'Spellcast is crit: %s', (crit ? 'TRUE' : 'FALSE'));
	
	damage = this.spellDamageBonusDone(victim, spellEntry, damage, DamageEffectType.SPELL_DIRECT_DAMAGE);
	damage = victim.spellDamageBonusTaken(this, spellEntry, damage, DamageEffectType.SPELL_DIRECT_DAMAGE);
	
	//Apply crit mod
	if (crit) {
		var critFactor = 1.5;
		
		//Apply Ruin mod
		switch (spellEntry.spellIconID) {
			case 31:  //Immolate
				critFactor = 2.0;
				break;
			
			case 213: //Shadow Bolt
				critFactor = 2.0;
				
				//Apply ISB this way since no trigger system
				victim.applyOrRefreshSpell(spellStore.lookupEntry(17800)); //Shadow Vulnerability 20%
				//console.log('Procced ISB on target');
				break;
		}
		
		results.critResult = SpellHitType.SPELL_HIT_TYPE_CRIT;
		damage *= critFactor;
		ZeroTheory.Utils.console('log', 'Damage was crit, is now: %d, factor: %d', damage, critFactor);
	}
	
	return damage ? damage : 0;
}

ZeroTheory.Unit.prototype.calculateResist = function(caster, school, damage, dmgType, results) {
	var resist = this.resistance[school - 1];
	
	//Pull auras lowering resistance
	for (var i = 0; i < this.spellAuraList.length; i++) {
		if (this.spellAuraList[i].auraType == AuraType.SPELL_AURA_MOD_RESISTANCE && 
		   (SpellSchoolMask.getSchoolMask(school) & this.spellAuraList[i].miscValue) != 0) {
			this.resist += this.spellAuraList[i].value;
		}
	}
	resist = resist > 0 ? resist : 0;
	
	results.resist = 0; //Reset resisted damage
	ZeroTheory.Utils.console('log', '%o has %i resistance for school: %i', this, resist, school);
	resist *= (0.15 / this.level);
	
	if (resist < 0) {
		resist = 0;
	}
	if (resist > 0.75) {
		resist = 0.75;
	}
	
	var rand = Math.random() * 100;
	ZeroTheory.Utils.console('log', 'Resistance random component: %d', rand);
	var faq = [24, 6, 4, 6];
	var m = 0;
	var binom = 0;
	
	for (var i = 0; i < 4; ++i) {
		binom += 2400 * (Math.pow(resist, i) * Math.pow(1 - resist, 4 - i)) / faq[i];
		if (rand > binom) {
			++m;
		}
		else {
			break;
		}
	}
	
	if (dmgType == DamageEffectType.DOT && m == 4) {
		results.resist += (damage - 1);
	}
	else {
		results.resist += (damage * m / 4); 
	}
	if (results.resist > damage) {
		results.resist = damage;
	}
	
	var remainingDamage = damage - results.resist;
	ZeroTheory.Utils.console('log', 'Resisted damage: %d; remainder: %d;', results.resist, remainingDamage);
	return remainingDamage > 0 ? remainingDamage : 0;
}

ZeroTheory.Unit.prototype.spellDamageBonusDone = function(victim, spellEntry, damage, dmgType) {
	var doneTotalMod = 1.0;
	var doneTotal = 0;
	var schoolMask = SpellSchoolMask.getSchoolMask(spellEntry.school);
	ZeroTheory.Utils.console('log', 'Calculating bonus damage with schoolMask: %i', schoolMask);
	
	for (var i = 0; i < this.spellAuraList.length; i++) {
		if (this.spellAuraList[i].auraType == AuraType.SPELL_AURA_MOD_DAMAGE_PERCENT_DONE &&
		    (this.spellAuraList[i].miscValue & schoolMask) != 0) {
			doneTotalMod = doneTotalMod * (this.spellAuraList[i].value + 100.0) / 100.0;
			//console.log('Found dmg done mod: %i, total mod now: %d', this.spellAuraList[i].value, doneTotalMod);
		}
	}
	
	ZeroTheory.Utils.console('log', 'DoneTotalMod is now: %d', doneTotalMod);
	
	var bonusDmg = 0;
	switch (spellEntry.school) {
		case SpellSchools.SPELL_SCHOOL_FIRE:
			bonusDmg = this.stats.fsp > this.stats.sp ? this.stats.fsp : this.stats.sp;
			break;
		
		case SpellSchools.SPELL_SCHOOL_SHADOW:
			bonusDmg = this.stats.ssp > this.stats.sp ? this.stats.ssp : this.stats.sp;
			break;
	}
	
	ZeroTheory.Utils.console('log', 'Caster has %i bonus school spell damage', bonusDmg);
	
	doneTotal = this.spellBonusWithCoeffs(spellEntry, doneTotal, bonusDmg, dmgType);
	
	ZeroTheory.Utils.console('log', 'Final bonus spell damage: %d', doneTotal);
	
	var tmpDamage = (damage + doneTotal) * doneTotalMod;
	for (var i = 0; i < this.spellAuraList.length; i++) {
		if (this.spellAuraList[i].miscValue == (dmgType == DamageEffectType.DOT ? 22 : 0)) {
			tmpDamage = tmpDamage * (this.spellAuraList[i].value + 100.0) / 100.0;
			//console.log('Found flat dmg done mod: %i', this.spellAuraList[i].value);
		}
	}
	
	ZeroTheory.Utils.console('log', 'Flat mod applied, damage now: %d', tmpDamage);
	
	return tmpDamage > 0 ? tmpDamage : 0;
}

ZeroTheory.Unit.prototype.spellDamageBonusTaken = function(caster, spellEntry, damage, dmgType) {
	var doneTotalMod = 1.0;
	var doneTotal = 0;
	var schoolMask = SpellSchoolMask.getSchoolMask(spellEntry.school);
	
	for (var i = 0; i < this.spellAuraList.length; i++) {
		if (this.spellAuraList[i].auraType == AuraType.SPELL_AURA_MOD_DAMAGE_PERCENT_TAKEN &&
		   (this.spellAuraList[i].miscValue & schoolMask) != 0) {
			doneTotalMod = doneTotalMod * (this.spellAuraList[i].value + 100.0) / 100.0;
			//console.log('Found dmg taken mod: %i, total mod now: %d', this.spellAuraList[i].value, doneTotalMod);
			if (dmgType == DamageEffectType.SPELL_DIRECT_DAMAGE &&
				spellEntry.school == SpellSchools.SPELL_SCHOOL_SHADOW &&
				this.spellAuraList[i].owner.spellInfo.ID == 17800) {
				this.spellAuraList[i].charges -= 1; //Remove charges from ISB
				//console.log('Removed ISB charge, now: %i, was %i', this.spellAuraList[i].charges, this.spellAuraList[i].charges + 1);
			}
		}
	}
	
	ZeroTheory.Utils.console('log', 'Damage taken on target %o increased by: %d', this, doneTotalMod);
	
	var tmpDamage = (damage + doneTotal) * doneTotalMod;
	
	ZeroTheory.Utils.console('log', 'Unmitigated damage taken: %d', tmpDamage);
	
	return tmpDamage > 0 ? tmpDamage : 0;
}

ZeroTheory.Unit.prototype.spellBonusWithCoeffs = function(spellEntry, total, benefit, dmgType) {
	var coeff = 0;
	
	if (benefit) {
		coeff = ZeroTheory.Spell.calculateDefaultCoefficient(spellEntry, dmgType);
		benefit *= coeff;
	}
	
	return total + benefit;
}

ZeroTheory.Unit.prototype.isSpellCrit = function(victim, spellEntry) {
	var rate0 = 11.3;
	var rate1 = 0.82;
	var base = 3.18;
	var ratio = rate0 + rate1 * this.level;
	var critchance = base + this.stats.intellect / ratio;
	
	//Hackfix for talent: Devastation
	switch (spellEntry.spellIconID) {
		case 31:  //Immolate
		case 213: //Shadow Bolt
			critchance += 5.0;
			break;
	}
	critchance += this.stats.spellCritPct;
	
	var rand = Math.random() * 100;
	ZeroTheory.Utils.console('log', 'Crit chance: %d; Roll: %d', critchance, rand);
	return critchance > rand;
}

ZeroTheory.Unit.prototype.update = function(elapsed) {
	for (var i = this.spellAuraList.length - 1; i >= 0; i--) {
		this.spellAuraList[i].update(elapsed);
		if (this.spellAuraList[i].duration <= 0 && this.spellAuraList[i].maxDuration > 0) {
			this.spellAuraList.splice(i, 1);
		}
		else if (this.spellAuraList[i].charges < 1 && this.spellAuraList[i].stackAmount > 0) {
			this.spellAuraList.splice(i, 1);
		}
	}
}

ZeroTheory.Unit.prototype.applyOrRefreshSpell = function(spellEntry) {
	if (this.hasSpell(spellEntry)) {
		this.refreshAurasBySpell(spellEntry);
	}
	else {
		new ZeroTheory.Spell(spellEntry).doAllEffectOnTarget(this);
	}
}

ZeroTheory.Unit.prototype.refreshAurasBySpell = function(spellEntry) {
	for (var i = 0; i < this.spellAuraList.length; i++) {
		if (this.spellAuraList[i].owner.spellInfo.ID == spellEntry.ID) {
			this.spellAuraList[i].reset();
		}
	}
}

ZeroTheory.Unit.prototype.removeAurasBySpell = function(spellEntry) {
	if (this.hasSpell(spellEntry)) {
		for (var i = this.spellAuraList.length - 1; i >= 0; i--) {
			if (this.spellAuraList[i].owner.spellInfo.ID == spellEntry.ID) {
				this.spellAuraList.splice(i, 1);
			}
		}
	}
}

ZeroTheory.Unit.prototype.hasSpell = function(spellEntry) {
	var result = false;
	for (var i = 0; i < this.spellAuraList.length; i++) {
		if (this.spellAuraList[i].owner.spellInfo.ID == spellEntry.ID) {
			result = true;
			break;
		}
	}
	return result;
}

ZeroTheory.Unit.prototype.castSpellOnSelf = function(spell) { //Bypasses hit checking
	spell.doAllEffectOnTarget(this); //Can damage self, heh
}

