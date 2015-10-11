/**
 * @version 1.0
 * @author SouD
 *
 * Class representing a unit in simaltions. Contains methods
 * needed for calculations related to a unit's stats,
 * resistances and other values.
 */

/**
 * Class representing a unit in simulations.
 *
 * @constructor Unit
 * @param {number} lv Unit level
 * @param {array} resists Unit resistance values
 */
var Unit = function (lv, resists) {
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
        fsp: 0
    };
    this.resistance = resists ? resists : [0, 0, 0, 0, 0, 0];
    this.spellAuraList = []; // Holds instances of Aura
};

/**
 * Wrapper for hit result rolling. Differentiates between
 * types of spells and uses the appropriate method to
 * roll the outcome.
 *
 * @param {Unit} victim Spell victim
 * @param {object} spellEntry Spell entry information
 * @return {SpellMissInfo} Outcome of roll
 */
Unit.prototype.spellHitResult = function (victim, spellEntry) {
    switch (spellEntry.defenseType) {
        case SpellDmgClass.SPELL_DAMAGE_CLASS_NONE:
            return SpellMissInfo.SPELL_MISS_NONE;

        case SpellDmgClass.SPELL_DAMAGE_CLASS_MAGIC:
            return this.magicSpellHitResult(victim, spellEntry);

        case SpellDmgClass.SPELL_DAMAGE_CLASS_MELEE:
        case SpellDmgClass.SPELL_DAMAGE_CLASS_RANGED:
            return SpellMissInfo.SPELL_MISS_NONE; // Add method if needed in future
    }

    return SpellMissInfo.SPELL_MISS_NONE;
};

/**
 * Hit rolling method for magical spells.
 *
 * @param {Unit} victim Spell victim
 * @param {object} spellEntry Spell entry information
 * @return {SpellMissInfo} Outcome of roll
 */
Unit.prototype.magicSpellHitResult = function (victim, spellEntry) {
    var lchance = 11;
    var ldiff = victim.level - this.level;
    var modHitChance;

    if (ldiff < 3) {
        modHitChance = 96 - ldiff;
    } else {
        modHitChance = 94 - (ldiff - 2) * lchance;
    }

    console.debug('modHitChance: %i%', modHitChance);

    var flatMod = 0;
    if (ZeroTheory.activeSpecc == SM_RUIN || ZeroTheory.activeSpecc == DS_RUIN_SUPP) {
        switch (spellEntry.spellIconID) {
            case 55:  // Curse of the Elements
            case 91:  // Curse of Doom
            case 152: // Siphon Life
            case 313: // Corruption
            case 542: // Curse of Shadow
            case 544: // Curse of Agony
                flatMod = 10;

                console.debug('Suppression talent detected, adding 10% +hit');

                break;
        }
    }

    flatMod += this.stats.spellHitPct; // Add +hit from stats
    modHitChance += flatMod;

    console.debug('Total chance to hit: %i%', modHitChance);

    var hitChance = modHitChance * 100;

    if (hitChance < 100) {
        hitChance = 100;
    }

    if (hitChance > 9900) {
        hitChance = 9900;
    }

    var tmp = 10000 - hitChance;
    var rand = Math.floor(Math.random() * (10000 + 1));

    console.debug('Rolled outcome: rand=%i, tmp=%i;', rand, tmp);

    if (rand < tmp) {
        return SpellMissInfo.SPELL_MISS_RESIST;
    }

    return SpellMissInfo.SPELL_MISS_NONE;
};

/**
 * Cast supplied spell using this Unit as caster.
 *
 * @param {Spell} spell Spell to cast
 * @param {Unit} target Target of the cast
 */
Unit.prototype.cast = function (spell, target) {
    spell.cast(this, target);
};

/**
 * Calculates the base damage of a spell effect based on
 * the supplied spellEntry.
 *
 * @param {Unit} victim Spell victim
 * @param {object} spellEntry Spell entry information
 * @param {number} effectIndex Index of the effect which
 *     to calculate base damage for
 * @param {number} effBasePoints Base points from the
 *     effectBasePoints field spellEntry
 * @return {number} Result from calculation
 */
Unit.prototype.calculateBaseDamage = function (victim, spellEntry, effectIndex, effBasePoints) {
    var lv = this.level;

    if (lv > spellEntry.maxLevel && spellEntry.maxLevel > 0) {
        lv = spellEntry.maxLevel;
    } else if (lv < spellEntry.baseLevel) {
        lv = spellEntry.baseLevel;
    }

    lv -= spellEntry.spellLevel;

    var baseDice = spellEntry['effectBaseDice' + effectIndex];
    var basePointsPerLevel = spellEntry['effectRealPointsPerLevel' + effectIndex];
    var randomPointsPerLevel = spellEntry['effectDicePerLevel' + effectIndex];
    var basePoints = effBasePoints ? effBasePoints - baseDice : spellEntry['effectBasePoints' + effectIndex];

    basePoints += lv * basePointsPerLevel;
    var randomPoints = spellEntry['effectDieSides' + effectIndex] + lv * randomPointsPerLevel;

    console.debug('Spell info: spellLevel: %i; spellMaxLevel: %i; spellBaseLevel: %i;',
        spellEntry.spellLevel, spellEntry.maxLevel, spellEntry.baseLevel);
    console.debug('baseDice: %i; basePointsPerLevel: %i; randomPointsPerLevel: %i; basePoints: %i; randomPoints: %i;',
        baseDice, basePointsPerLevel, randomPointsPerLevel, basePoints, randomPoints);

    switch (randomPoints) {
        case (randomPoints >= 0):
        case (randomPoints >= 1):
            basePoints += baseDice;
            break;

        default:
            // Math.floor(Math.random() * (max - min + 1)) + min;
            var l = Math.floor(Math.random() * (baseDice - randomPoints + 1)) + randomPoints;
            var r = Math.floor(Math.random() * (randomPoints - baseDice + 1)) + baseDice;
            var randValue = (baseDice >= randomPoints) ? l : r;
            basePoints += randValue;
            break;
    }

    var value = basePoints;
    if ((spellEntry.attributes & 0x00080000) && spellEntry.spellLevel && spellEntry['effect' + effectIndex] != SpellEffect.SPELL_EFFECT_APPLY_AURA) {
        value = value * 0.25 * Math.exp(this.level * (70 - spellEntry.spellLevel) / 1000);
    }

    console.debug('Final value of basePoints: %i;', value);

    return value;
};

/**
 * Wrapper method for spell damage calculations.
 * Used for direct school damage effects. Calculates
 * bonus damage done, taken, crit bonus and partially
 * resisted damage.
 *
 * @param {Unit} victim Spell victim
 * @param {object} spellEntry Spell entry information
 * @param {number} damage Spell base damage
 * @param {object} results Spell results holder
 * @return {number} Final damage after calculations
 */
Unit.prototype.calculateSpellDamage = function (victim, spellEntry, damage, results) {
    var crit = this.isSpellCrit(victim, spellEntry);

    console.debug('Spellcast is crit: %s', (crit ? 'TRUE' : 'FALSE'));

    damage = this.spellDamageBonusDone(victim, spellEntry, damage,
        DamageEffectType.SPELL_DIRECT_DAMAGE);
    damage = victim.spellDamageBonusTaken(this, spellEntry, damage,
        DamageEffectType.SPELL_DIRECT_DAMAGE);

    // Apply crit mod
    if (crit) {
        var critFactor = 1.5;

        // Apply Ruin mod
        switch (spellEntry.spellIconID) {
            case 31:  // Immolate
                critFactor = 2.0;
                break;

            case 213: // Shadow Bolt
                critFactor = 2.0;

                // Apply ISB this way since no trigger system
                victim.applyOrRefreshSpell(spellStore.lookupEntry(SHADOW_VULNERABILITY_ID)); // Shadow Vulnerability 20%
                break;
        }

        results.critResult = SpellHitType.SPELL_HIT_TYPE_CRIT;
        damage *= critFactor;

        console.debug('Damage was crit, is now: %d, factor: %d', damage, critFactor);
    }

    return damage ? damage : 0;
};

/**
 * Calculates how much damage will be partially
 * resisted using {@code this.resistance} values.
 *
 * @param {Unit} caster Spell caster
 * @param {number} school Spell effect school
 * @param {number} damage Current spell effect damage
 * @param {DamageEffectType} dmgType Damage type
 * @param {object} results Spell results holder
 * @return {number} Remaining damage of starting value
 */
Unit.prototype.calculateResist = function (caster, school, damage, dmgType, results) {
    var resist = this.resistance[school - 1];

    //Pull auras lowering resistance
    for (var i = 0; i < this.spellAuraList.length; i++) {
        if (this.spellAuraList[i].auraType == AuraType.SPELL_AURA_MOD_RESISTANCE &&
           (SpellSchoolMask.getSchoolMask(school) & this.spellAuraList[i].miscValue) !== 0) {
            this.resist += this.spellAuraList[i].value;
        }
    }

    resist = resist > 0 ? resist : 0;

    results.resist = 0; // Reset resisted damage

    console.debug('%o has %i resistance for school: %i', this, resist, school);

    resist *= (0.15 / this.level);

    if (resist < 0) {
        resist = 0;
    }

    if (resist > 0.75) {
        resist = 0.75;
    }

    var rand = Math.random() * 100;

    console.debug('Resistance random component: %d', rand);

    var faq = [24, 6, 4, 6];
    var m = 0;
    var binom = 0;

    for (var i = 0; i < 4; ++i) {
        binom += 2400 * (Math.pow(resist, i) * Math.pow(1 - resist, 4 - i)) / faq[i];

        if (rand > binom) {
            ++m;
        } else {
            break;
        }
    }

    if (dmgType == DamageEffectType.DOT && m == 4) {
        results.resist += (damage - 1);
    } else {
        results.resist += (damage * m / 4);
    }

    if (results.resist > damage) {
        results.resist = damage;
    }

    var remainingDamage = damage - results.resist;

    console.debug('Resisted damage: %d; remainder: %d;', results.resist,
        remainingDamage);

    return remainingDamage > 0 ? remainingDamage : 0;
};

/**
 * Calculates spell damage bonus from {@code Aura}s on {@code this}
 * as well as {@code this} bonus damage (the stat).
 *
 * @param {Unit} victim Spell victim
 * @param {object} spellEntry Spell entry information
 * @param {number} damage Current spell effect damage
 * @param {DamageEffectType} dmgType Damage type
 * @return {number} Spell effect damage after added bonuses
 */
Unit.prototype.spellDamageBonusDone = function (victim, spellEntry, damage, dmgType) {
    var doneTotalMod = 1.0;
    var doneTotal = 0;
    var schoolMask = SpellSchoolMask.getSchoolMask(spellEntry.school);

    console.debug('Calculating bonus damage with schoolMask: %i', schoolMask);

    for (var i = 0; i < this.spellAuraList.length; i++) {
        if (this.spellAuraList[i].auraType == AuraType.SPELL_AURA_MOD_DAMAGE_PERCENT_DONE &&
            (this.spellAuraList[i].miscValue & schoolMask) !== 0) {
            doneTotalMod = doneTotalMod * (this.spellAuraList[i].value + 100.0) / 100.0;

            console.debug('Found dmg done mod: %i, total mod now: %d',
                this.spellAuraList[i].value, doneTotalMod);
        }
    }

    console.debug('DoneTotalMod is now: %d', doneTotalMod);

    var bonusDmg = 0;
    switch (spellEntry.school) {
        case SpellSchools.SPELL_SCHOOL_FIRE:
            bonusDmg = this.stats.fsp > this.stats.sp ? this.stats.fsp : this.stats.sp;
            break;

        case SpellSchools.SPELL_SCHOOL_SHADOW:
            bonusDmg = this.stats.ssp > this.stats.sp ? this.stats.ssp : this.stats.sp;
            break;
    }

    console.debug('Caster has %i bonus school spell damage', bonusDmg);

    doneTotal = this.spellBonusWithCoeffs(spellEntry, doneTotal, bonusDmg, dmgType);

    console.debug('Final bonus spell damage: %d', doneTotal);

    var tmpDamage = (damage + doneTotal) * doneTotalMod;
    for (var i = 0; i < this.spellAuraList.length; i++) {
        if (this.spellAuraList[i].miscValue == (dmgType == DamageEffectType.DOT ? 22 : 0)) {
            tmpDamage = tmpDamage * (this.spellAuraList[i].value + 100.0) / 100.0;

            console.debug('Found flat dmg done mod: %i', this.spellAuraList[i].value);
        }
    }

    console.debug('Flat mod applied, damage now: %d', tmpDamage);

    return tmpDamage > 0 ? tmpDamage : 0;
};

/**
 * Calculates bonus damage taken by {@code this} from
 * supplied {@code Spell}. Takes damage reducing and
 * increasing {@code Aura}s into account.
 *
 * @param {Unit} caster Spell caster
 * @param {object} spellEntry Spell entry information
 * @param {number} damage Current spell effect damage
 * @param {DamageEffectType} dmgType Damage type
 * @return {number} Damage after calculations
 */
Unit.prototype.spellDamageBonusTaken = function (caster, spellEntry, damage, dmgType) {
    var doneTotalMod = 1.0;
    var doneTotal = 0;
    var schoolMask = SpellSchoolMask.getSchoolMask(spellEntry.school);

    for (var i = 0; i < this.spellAuraList.length; i++) {
        if (this.spellAuraList[i].auraType == AuraType.SPELL_AURA_MOD_DAMAGE_PERCENT_TAKEN &&
           (this.spellAuraList[i].miscValue & schoolMask) !== 0) {
            doneTotalMod = doneTotalMod * (this.spellAuraList[i].value + 100.0) / 100.0;

            console.debug('Found dmg taken mod: %i, total mod now: %d',
                this.spellAuraList[i].value, doneTotalMod);

            if (dmgType == DamageEffectType.SPELL_DIRECT_DAMAGE &&
                spellEntry.school == SpellSchools.SPELL_SCHOOL_SHADOW &&
                this.spellAuraList[i].owner.spellInfo.ID == 17800) {
                this.spellAuraList[i].charges -= 1; // Remove charges from ISB

                console.debug('Removed ISB charge, now: %i, was %i',
                    this.spellAuraList[i].charges, this.spellAuraList[i].charges + 1);
            }
        }
    }

    console.debug('Damage taken on target %o increased by: %d', this, doneTotalMod);

    var tmpDamage = (damage + doneTotal) * doneTotalMod;

    console.debug('Unmitigated damage taken: %d', tmpDamage);

    return tmpDamage > 0 ? tmpDamage : 0;
};

/**
 * Calculates how much bonus spell damage that will
 * be added based on the spells coefficient.
 *
 * @param {object} spellEntry Spell entry information
 * @param {number} total Current spell effect damage without
 *     spell bonus damage
 * @param {number} benefit Total spell school damage bonus
 * @param {DamageEffectType} dmgType Damage type
 * @return {number} Spell damage with bonus damage added
 */
Unit.prototype.spellBonusWithCoeffs = function (spellEntry, total, benefit, dmgType) {
    var coeff = 0;

    if (benefit) {
        coeff = Spell.calculateDefaultCoefficient(spellEntry, dmgType);
        benefit *= coeff;
    }

    return total + benefit;
};

/**
 * Rolls to see if spell casted by {@code this} will be
 * a critical hit. Takes bonus crit from talents and crit
 * from intellect into account.
 *
 * @param {Unit} victim Spell victim
 * @param {object} spellEntry Spell entry information
 * @return {boolean} Roll outcome
 */
Unit.prototype.isSpellCrit = function (victim, spellEntry) {
    var rate0 = 11.3;
    var rate1 = 0.82;
    var base = 3.18;
    var ratio = rate0 + rate1 * this.level;
    var critchance = base + this.stats.intellect / ratio;

    // TODO: Take crit from auras into account?

    // Hackfix for talent: Devastation
    switch (spellEntry.spellIconID) {
        case 31:  // Immolate
        case 213: // Shadow Bolt
            critchance += 5.0;
            break;
    }

    critchance += this.stats.spellCritPct;

    var rand = Math.random() * 100;

    console.debug('Crit chance: %d; Roll: %d', critchance, rand);

    return critchance > rand;
};

/**
 * Updates all {@code Aura}s in {@code this.spellAuraList}.
 *
 * @param {number} elapsed Time delta since last call
 */
Unit.prototype.update = function (elapsed) {
    for (var i = this.spellAuraList.length - 1; i >= 0; i--) {
        this.spellAuraList[i].update(elapsed);

        if (this.spellAuraList[i].duration <= 0 && this.spellAuraList[i].maxDuration > 0) {
            this.spellAuraList.splice(i, 1);
        } else if (this.spellAuraList[i].charges < 1 && this.spellAuraList[i].stackAmount > 0) {
            this.spellAuraList.splice(i, 1);
        }
    }
};

/**
 * Applies or refreshes all effects of supplied spell
 * on {@code this}.
 *
 * @param {object} spellEntry Spell entry information.
 */
Unit.prototype.applyOrRefreshSpell = function (spellEntry) {
    if (this.hasSpell(spellEntry)) { // Refresh
        this.refreshAurasBySpell(spellEntry);
    } else { // Cast new spell
        new Spell(spellEntry).doAllEffectOnTarget(this);
    }
};

/**
 * Refresh all {@code Aura}s caused by the supplied spell
 * on {@code this}.
 *
 * @param {object} spellEntry Spell entry information
 */
Unit.prototype.refreshAurasBySpell = function (spellEntry) {
    for (var i = 0; i < this.spellAuraList.length; i++) {
        if (this.spellAuraList[i].owner.spellInfo.ID == spellEntry.ID) {
            this.spellAuraList[i].reset();
        }
    }
};

/**
 * Remove all {@code Aura}s caused by the supplied spell
 * on {@code this}.
 *
 * @param {object} spellEntry Spell entry information
 */
Unit.prototype.removeAurasBySpell = function (spellEntry) {
    if (this.hasSpell(spellEntry)) {
        for (var i = this.spellAuraList.length - 1; i >= 0; i--) {
            if (this.spellAuraList[i].owner.spellInfo.ID == spellEntry.ID) {
                this.spellAuraList.splice(i, 1); // Remove it!
            }
        }
    }
};

/**
 * Checks {@code this} to see if it has effects cause by
 * the supplied spell.
 *
 * @param {object} spellEntry Spell entry information
 * @return {boolean} Result of check
 */
Unit.prototype.hasSpell = function (spellEntry) {
    var result = false;

    for (var i = 0; i < this.spellAuraList.length; i++) {
        if (this.spellAuraList[i].owner.spellInfo.ID == spellEntry.ID) {
            result = true;
            break;
        }
    }

    return result;
};

/**
 * Cast supplied {@code Spell} on {@code this}.
 * Bypasses hit checking, can damage caster.
 *
 * @param {Spell} spell Spell to cast on self
 */
Unit.prototype.castSpellOnSelf = function(spell) { // Bypasses hit checking
    spell.doAllEffectOnTarget(this); // Can damage self, heh
};
