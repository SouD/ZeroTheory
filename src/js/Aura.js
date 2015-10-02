/**
 * @version 1.0
 * @author SouD
 *
 * Class representing an aura which may be applied
 * to an instance of a Unit class.
 */

/**
 * An aura which can be applied to an instance
 * of the Unit class.
 *
 * @constructor Aura
 * @param {Unit} caster Aura caster
 * @param {Unit} affects Unit aura is applied on
 * @param {Spell} spell Spell owner
 * @param {number} effectIndex Index of effect causing aura
 */
Aura = function(caster, affects, spell, effectIndex) {
    this.caster = caster;
    this.affects = affects;
    this.owner = spell;

    var spellEntry = spell.spellInfo;

    this.auraType = spellEntry['effectAura' + effectIndex];
    this.value = Spell.calculateSimpleValue(spellEntry, effectIndex);
    this.miscValue = spellEntry['effectMiscValue' + effectIndex];
    this.maxDuration = spell.durationInfo.maxDuration;
    this.duration = spell.durationInfo.duration;
    this.stackAmount = spellEntry.stackAmount;

    // Force charges on some spells
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
                case 31: // Immolate
                    this.periodicTime = 3000;
                    break;

                case 91: // Curse of Doom
                    this.periodicTime = 60000;
                    break;

                case 152: // Siphon Life
                case 313: // Corruption
                    this.periodicTime = 3000;
                    break;

                case 544: // Curse of Agony
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
};

/**
 * Reset {@code this} values to starting values.
 */
Aura.prototype.reset = function() {
    if (this.isPeriodic) {
        this.numTicks = 0;
        this.tickTimer = this.periodicTime;
    }

    this.duration = this.maxDuration;
    this.lastUpdate = new Date().getTime();
    this.charges = this.stackAmount;
};

/**
 * Updates {@code this} duration and calls handler.
 *
 * @param {number} elapsed Time delta since last update
 */
Aura.prototype.update = function(elapsed) {
    if (this.duration > 0) {
        this.duration -= elapsed;
        this.lastUpdate = this.lastUpdate + elapsed;
    }

    this._handleUpdate(elapsed);
};

/**
 * Handles any periodic effects for {@code this}.
 *
 * @param {number} elapsed Time delta since last update
 */
Aura.prototype._handleUpdate = function(elapsed) {
    if (this.isPeriodic) {
        this.tickTimer -= elapsed;

        if (this.tickTimer <= 0) {
            this.tickTimer = this.periodicTime; //Reset tick timer and inc num ticks
            this.numTicks++;
            this.periodicTick();
        }
    }
};

/**
 * Does a period tick damage calculation and adds the
 * result to the owning spell results holder.
 */
Aura.prototype.periodicTick = function() {
    switch (this.auraType) {
        case AuraType.SPELL_AURA_PERIODIC_DAMAGE:
            console.debug('Doing tick for %o, tick no: %i', this, this.numTicks);

            var resist = 0;
            var spellEntry = this.owner.spellInfo;
            var damage = this.value;

            damage = this.affects.spellDamageBonusTaken(this.caster, spellEntry, damage, DamageEffectType.DOT);

            if (spellEntry.spellClassSet == SpellFamily.SPELLFAMILY_WARLOCK && spellEntry.spellIconID == 544) { // CoA tick damage modifying
                if (this.numTicks <= 4) {
                    damage /= 2; // 1/2 tick damage
                } else if (this.numTicks >= 9) {
                    damage += (damage + 1) / 2; // 3/2 tick damage
                }
            }

            damage = this.affects.calculateResist(this.caster, spellEntry.school, damage, DamageEffectType.DOT, this.owner.results);

            // Apply affliction talent Nightfall
            if (damage > 0 && spellEntry.spellIconID == 313 && ZeroTheory.activeSpecc == SM_RUIN) {
                var rand = Math.random() * 100,
                    chance = 4.0;

                if (chance > rand) { // 4% chance
                    this.caster.applyOrRefreshSpell(spellStore.lookupEntry(17941)); // Apply Shadow Trance
                    this.owner.results.procs += 1;
                }
            }

            this.owner.results.dotDamage += damage; //Add damage to total of dot
            break;
    }
};
