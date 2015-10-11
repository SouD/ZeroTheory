/**
 * @author SouD
 */

var zt = null,
    spellStore = null,
    spellCastTimesStore = null,
    spellDurationStore = null;

jQuery(function ($) {
    zt = new ZeroTheory();

    spellStore = new DBCStore();
    $.getJSON(DBC_PATH + 'Spell.json', function(dbc) {
        spellStore.load(dbc);
    });

    spellCastTimesStore = new DBCStore();
    $.getJSON(DBC_PATH + 'SpellCastTimes.json', function(dbc) {
        spellCastTimesStore.load(dbc);
    });

    spellDurationStore = new DBCStore();
    $.getJSON(DBC_PATH + 'SpellDuration.json', function(dbc) {
        spellDurationStore.load(dbc);
    });

    $('.stat').change(function () {
        var value = $(this).val(),
            key = $(this).prop('id');

        if (value) {
            value = parseInt(value, 10);

            if (isNaN(value)) {
                $(this).val(0);
            } else {
                zt.caster.stats[key] = Math.abs(value);
            }
        } else {
            zt.caster.stats[key] = 0;
            $(this).val(0);
        }
    });

    $('#run-time').blur(function () {
        var value = $(this).val();

        if (value) {
            value = parseInt(value, 10);

            if (isNaN(value)) {
                $(this).val(DEFAULT_RUNTIME);
            } else {
                zt.simVars.time = Math.abs(value);
            }
        } else {
            zt.simVars.time = DEFAULT_RUNTIME;
            $(this).val(DEFAULT_RUNTIME);
        }
    });

    $('.spell').change(function () {
        var checked = $(this).is(':checked'),
            key = $(this).data('key'),
            select = $(this).data('select');

        // Toggle rank selection and set value
        $('#' + select).prop('disabled', !checked);

        zt.spellInfo[key] = checked; // Set value
    });

    $('.spell-rank').change(function () {
        var key = $(this).data('key'),
            value = parseInt($(this).find('option:selected').val(), 10);

        zt.spellInfo[key] = value;
    });
});
