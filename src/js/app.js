/**
 * @author SouD
 */

var zt, store;

jQuery(function ($) {
    zt = new ZeroTheory();
    store = new SpellStore();

    $('.stat').blur(function () {
        var value = $(this).val(),
            key = $(this).prop('id');

        if (value) {
            value = parseInt(value, 10);

            if (isNaN(value)) {
                $(this).val('');

                console.debug('Input number for %s was NaN', key);
            } else {
                zt.caster.stats[key] = Math.abs(value);

                console.debug('Set zt.caster.stats.%s to %i', key, value);
            }
        } else {
            zt.caster.stats[key] = 0;

            console.debug('Set zt.caster.stats.%s to %i', key, 0);

            $(this).val('');
        }
    });

    $('#run-time').blur(function () {
        var value = $(this).val();

        if (value) {
            value = parseInt(value, 10);

            if (isNaN(value)) {
                $(this).val('');

                console.debug('Input number for time was NaN');
            } else {
                zt.simVars.time = Math.abs(value);

                console.debug('Set zt.simVars.time to %i', value);
            }
        }
        else {
            zt.simVars.time = DEFAULT_RUNTIME;

            console.debug('Set zt.simVars.time to %i', DEFAULT_RUNTIME);

            $(this).val('');
        }
    });

    $('.spell').change(function () {
        var checked = $(this).is(':checked'),
            spellName = $(this).data('spell-name');

        // Toggle rank selection and set value
        $('select[data-spell-name=' + spellName + ']').prop('disabled', checked);

        zt.spellInfo[key] = checked; // Set value

        console.debug('Set zt.spellInfo.%s to %s', key, checked);
    });

    $('.spell-rank').change(function () {
        var key = $(this).attr('name'),
            value = $(this).find('option:selected').val();

        zt.spellInfo[key] = parseInt(value, 10);

        console.debug('Set zt.spellInfo.%s to %i', key, value);
    });
});
