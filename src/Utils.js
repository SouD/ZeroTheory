/**
 * something something documentation.
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
	},
};
