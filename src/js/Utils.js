/**
 * @version 1.0
 * @author SouD
 *
 * Utilities available for use, namely a "vendor-safe" implementation
 * of the firebug console object and its functions.
 */

ZeroTheory.Utils = {
	debug: true,
	console: function(arg) {
		if (ZeroTheory.Utils.debug && typeof console === 'object' && (typeof arg === 'object' || typeof console[arg] === 'function')) {
			var args = [];
			if (typeof arg === 'object') {
				for (var method in arg) {
					if (typeof console[method] === 'function') {
						args = (arg[method].length) ? arg[method] : [arg[method]];
						console[method].apply(console, args);
					}
				}
			}
			else {
				console[arg].apply(console, Array.prototype.slice.call(arguments, 1));
			}
		}
	}
};

