module.exports = () => {
	return {
		postcssPlugin: 'postcss-fontvar-fallback',
		Declaration: {
			'font-weight': (decl) => {
				let already = decl.parent.some((i) => {
					return i.type === 'decl' && i.prop === 'font-variation-settings';
				});
				if (!already) {
					decl.cloneBefore({
						prop: 'font-variation-settings',
						value: `"wght" ${decl.value}`
					});
				}
			}
		}
	};
};
module.exports.postcss = true;
