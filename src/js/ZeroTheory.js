/**
 * @version 1.0
 * @author SouD
 */

/**
 * Holds the caster and the target (boss) and some
 * simulation variables.
 *
 * @constructor ZeroTheory
 */
ZeroTheory = function() {
    this.caster = new Unit(60); // Level 60 generic unit
    this.target = new Unit(63); // Level 63 generic unit

    //Keys match html ids
    this.spellInfo = {
        specc: SM_RUIN,
        useCurse: false,
        curseId: 17937,
        useCorruption: true,
        corruptionId: 11672,
        shadowBoltId: 11661,
        useImmolate: false,
        immolateId: 11668,
        useSiphonLife: false,
        siphonLifeId: 18881
    };

    // Key 'time' match html id
    this.simVars = {
        time: DEFAULT_RUNTIME,
        run: false
    };
};

/**
 * Prepares the caster by applying talent auras.
 */
ZeroTheory.prototype.prepareTalents = function() {
    ZeroTheory.activeSpecc = this.spellInfo.specc;
    var sm = new Spell(spellStore.lookupEntry(18275)); // Shadow Mastery
    var ds = new Spell(spellStore.lookupEntry(18791)); // Touch of Shadow

    switch (ZeroTheory.activeSpecc) {
        case SM_RUIN:
            if (this.caster.hasSpell(ds.spellInfo)) {
                this.caster.removeAurasBySpell(ds.spellInfo);
            }
            if (!this.caster.hasSpell(sm.spellInfo)) {
                this.caster.castSpellOnSelf(sm);
            }
            break;

        case DS_RUIN_CORR:
        case DS_RUIN_SUPP:
            if (this.caster.hasSpell(sm.spellInfo)) {
                this.caster.removeAurasBySpell(sm.spellInfo);
            }
            if (!this.caster.hasSpell(ds.spellInfo)) {
                ds.prepare(this.caster);

                // Modify duration to prevent ds falling of
                ds.durationInfo.maxDuration = 0;
                ds.durationInfo.duration = 0;

                this.caster.castSpellOnSelf(ds);
            }
            break;
    }
};

/**
 * Resets caster and target auras.
 */
ZeroTheory.prototype.resetAuras = function() {
    this.caster.spellAuraList = [];
    this.target.spellAuraList = [];
};

/**
 * Runs the simulation.
 */
ZeroTheory.prototype.run = function() {
    this.resetAuras();
    this.prepareTalents();
    var lockTimer = 0,
        timer = this.simVars.time,
        rotation = [],
        spellResults = [];

    rotation.push(new Spell(spellStore.lookupEntry(this.spellInfo.curseId)));

    spellResults.push({
        totalDamage: 0,
        hits: 0,
        crits: 0,
        resists: 0,
        partialResistedDamage: 0,
        timeSpentCasting: 0,
        uptime: 0
    });

    // Corruption
    if (this.spellInfo.useCorruption) {
        rotation.push(new Spell(spellStore.lookupEntry(this.spellInfo.corruptionId)));

        rotation[rotation.length - 1].prepare(this.caster);

        if (ZeroTheory.activeSpecc == SM_RUIN || ZeroTheory.activeSpecc == DS_RUIN_CORR) {
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

     // Immolate
    if (this.spellInfo.useImmolate) {
        rotation.push(new Spell(spellStore.lookupEntry(this.spellInfo.immolateId)));

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

    //Siphon Life
    if (this.spellInfo.useSiphonLife) {
        rotation.push(new ZeroTheory.Spell(spellStore.lookupEntry(this.spellInfo.siphonLifeId)));

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
    rotation.push(new Spell(spellStore.lookupEntry(this.spellInfo.shadowBoltId)));

    rotation[rotation.length - 1].prepare(this.caster);
    rotation[rotation.length - 1].castTimeInfo.base = 2500;

    spellResults.push({
        totalDamage: 0,
        hits: 0,
        crits: 0,
        resists: 0,
        partialResistedDamage: 0,
        timeSpentCasting: 0
    });

    var elapsed = 0,
        gcd = 0,
        ct = 0;

    // Main sim loop
    while (timer >= 0) {
        lockTimer = lockTimer > 0 ? lockTimer - elapsed : 0;
        this.caster.update(elapsed);
        this.target.update(elapsed);

        gcd = 0;
        ct = 0;

        if (lockTimer <= 0) { // Not casting, pick something to cast
            for (var i = 0; i < (rotation.length - 1); ++i) { // Loop rotation table to see what needs casting
                if (!this.target.hasSpell(rotation[i].spellInfo)) {
                    this.caster.cast(rotation[i], this.target);

                    if (rotation[i].results.hitResult == SpellMissInfo.SPELL_MISS_NONE) {
                        spellResults[i].hits += 1;

                        if (rotation[i].results.critResult == SpellHitType.SPELL_HIT_TYPE_CRIT) {
                            spellResults[i].crits += 1;
                        }

                        spellResults[i].totalDamage += rotation[i].results.directDamage;
                        spellResults[i].partialResistedDamage += rotation[i].results.resist;
                    } else {
                        spellResults[i].resists += 1;
                    }

                    gcd = rotation[i].spellInfo.startRecoveryTime;
                    ct = rotation[i].castTimeInfo.base;

                    lockTimer = ct >= gcd ? ct : gcd;
                    spellResults[i].timeSpentCasting += lockTimer;

                    break;
                }
            }

            if (lockTimer <= 0) { // No other spells cast, cast Shadow Bolt
                var sb = rotation.length - 1; // Shadow Bolt is always last index
                this.caster.cast(rotation[sb], this.target);

                if (rotation[sb].results.hitResult == SpellMissInfo.SPELL_MISS_NONE) {
                    spellResults[sb].hits += 1;

                    if (rotation[sb].results.critResult == SpellHitType.SPELL_HIT_TYPE_CRIT) {
                        spellResults[sb].crits += 1;
                    }

                    spellResults[sb].totalDamage += rotation[sb].results.directDamage;
                    spellResults[sb].partialResistedDamage += rotation[sb].results.resist;
                } else {
                    spellResults[sb].resists += 1;
                }

                gcd = rotation[sb].spellInfo.startRecoveryTime;
                ct = rotation[sb].castTimeInfo.base;

                var shadowTrance = spellStore.lookupEntry(17941);

                if (this.caster.hasSpell(shadowTrance)) {
                    ct = 0;
                    this.caster.removeAurasBySpell(shadowTrance);
                }

                lockTimer = ct >= gcd ? ct : gcd;
                spellResults[sb].timeSpentCasting += lockTimer;
            }
        }

        elapsed = 100; // Steps of 100 "msec"
        timer -= elapsed;
    }

    // Add some results into spellResults
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
};
