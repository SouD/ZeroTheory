/**
 * something something documentation
 */

ZeroTheory.Aura = function(caster, affects, spell, effectIndex) {
	this.caster = caster;
	this.affects = affects;
	this.owner = spell;
	
	var spellEntry = spell.spellInfo;
	
	this.auraType = spellEntry['effectAura' + effectIndex];
	this.value = ZeroTheory.Spell.calculateSimpleValue(spellEntry, effectIndex);
	this.miscValue = spellEntry['effectMiscValue' + effectIndex];
	this.maxDuration = spell.durationInfo.maxDuration;
	this.duration = spell.durationInfo.duration;
	this.stackAmount = spellEntry.stackAmount;
	
	//Hackit! Force charges on some spells
	switch (spellEntry.ID) {
		case 17800:
			this.stackAmount = 4;
			break;
		
		case 17941:
			this.stackAmount = 1;
			break;
	}
	this.charges = this.stackAmount;
	
	this.isPeriodic = false;
	this.periodicTime = 0;
	this.tickTimer = 0;
	this.maxTicks = 0;
	this.numTicks = 0;
	
	//Hackfix, yet again
	switch (this.auraType) {
		case AuraType.SPELL_AURA_PERIODIC_DAMAGE:
		case AuraType.SPELL_AURA_PERIODIC_DAMAGE_PERCENT:
			this.isPeriodic = true;
			switch (spellEntry.spellIconID) {
				case 31: //Immolate
					this.periodicTime = 3000;
					break;
				
				case 91: //Curse of Doom
					this.periodicTime = 60000;
					break;
				
				case 152: //Siphon Life
				case 313: //Corruption
					this.periodicTime = 3000;
					break;
				
				case 544: //Curse of Agony
					this.periodicTime = 2000;
					break;
			}
			this.maxTicks = this.duration / this.periodicTime;
			this.value = this.caster.calculateBaseDamage(this.affects, spellEntry, effectIndex, this.value);
			this.value = this.caster.spellDamageBonusDone(this.affects, spellEntry, this.value, DamageEffectType.DOT);
			this.tickTimer = this.periodicTime;
			break;
	}
	
	this.applyTime = new Date().getTime();
	this.lastUpdate = this.applyTime;
}

ZeroTheory.Aura.prototype.reset = function() {
	if (this.isPeriodic) {
		this.numTicks = 0;
		this.tickTimer = this.periodicTime;
	}
	this.duration = this.maxDuration;
	this.lastUpdate = new Date().getTime();
	this.charges = this.stackAmount;
}

ZeroTheory.Aura.prototype.update = function(elapsed) {
	if (this.duration > 0) {
		this.duration -= elapsed;
		this.lastUpdate = this.lastUpdate + elapsed;
	}
	this._handleUpdate(elapsed);
}

ZeroTheory.Aura.prototype._handleUpdate = function(elapsed) {
	if (this.isPeriodic) {
		this.tickTimer -= elapsed;
		if (this.tickTimer <= 0) {
			this.tickTimer = this.periodicTime; //Reset tick timer and inc num ticks
			this.numTicks++;
			this.periodicTick();
		}
	}
}

ZeroTheory.Aura.prototype.periodicTick = function() {
	switch (this.auraType) {
		case AuraType.SPELL_AURA_PERIODIC_DAMAGE:
			ZeroTheory.Utils.console('log', 'Doing tick for %o, tick no: %i', this, this.numTicks);
			
			var resist = 0;
			var spellEntry = this.owner.spellInfo;
			var damage = this.value;
			damage = this.affects.spellDamageBonusTaken(this.caster, spellEntry, damage, DamageEffectType.DOT);
			
			if (spellEntry.spellClassSet == SpellFamily.SPELLFAMILY_WARLOCK && spellEntry.spellIconID == 544) { //CoA tick damage modifying
				if (this.numTicks <= 4) {
					damage /= 2; // 1/2 tick damage
				}
				else if (this.numTicks >= 9) {
					damage += (damage + 1) / 2; // 3/2 tick damage
				}
			}
			
			damage = this.affects.calculateResist(this.caster, spellEntry.school, damage, DamageEffectType.DOT, this.owner.results);
			
			//Hackfix for Affliction talent Nightfall
			if (damage > 0 && spellEntry.spellIconID == 313 && ZeroTheory.activeSpecc == ZeroTheory.SM_RUIN) {
				var rand = Math.random() * 100;
				var chance = 4.0;
				if (chance > rand) { //4% chance
					this.caster.applyOrRefreshSpell(spellStore.lookupEntry(17941)); //Apply Shadow Trance
					this.owner.results.procs += 1;
				}
			}
			
			this.owner.results.dotDamage += damage; //Add damage to total of dot
			break;
	}
}

