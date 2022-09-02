module.exports = () => {
    return {
        postcssPlugin: 'postcss-will-change',
        Declaration: {
            'will-change': decl => {
                let already = decl.parent.some(i => {
                    return i.type === 'decl' && i.prop === 'backface-visibility'
                })
                if (!already) {
                    decl.cloneBefore({ prop: 'backface-visibility', value: 'hidden' })
                }
            }
        },
        postcssPlugin: 'postcss-fontvar-fallback',
        Declaration: {
            'font-weight': decl => {
                let already = decl.parent.some(i => {
                    return i.type === 'decl' && i.prop === 'font-variation-settings'
                })
                if (!already) {
                    decl.cloneBefore({
                        prop: 'font-variation-settings', value: `"wght" ${decl.value}`
                    })
                }
            }
        }
    }
}
module.exports.postcss = true