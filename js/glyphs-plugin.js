//remarkable plugin for captions in wordpress
//@@asterisk
//<span class="glyphicon glyphicon-asterisk" aria-hidden="true"></span>
function glyphs_plugin(remarkable) {

    this.parse = function(state, silent) {
        var max = state.posMax,
            pos = state.pos;

        if (max - pos < 5) return false;

        if (state.src.charCodeAt(pos) !== 0x40/* @ */
            || state.src.charCodeAt(pos + 1) !== 0x40/* @ */) return false;
        pos += 2;

        while (pos < max && (isAlphaNum(state.src.charCodeAt(pos))
            || state.src.charCodeAt(pos) === 0x2D/* - */)) {
            pos++;
        }

        if (pos - state.pos < 5) return false;

        if (!silent) {
            var glyph = state.src.slice(state.pos + 2, pos);
            state.push({
                type: 'glyph',
                level: state.level,
                icon: glyph
            });
        }
        state.pos = pos;
        return true;
    };

    this.glyph = function(tokens, id, options, env) {
        return '<span class="glyphicon glyphicon-' + tokens[id].icon + '" aria-hidden="true"></span>';
    };

    remarkable.inline.ruler.push('glyph', this.parse.bind(this));
    remarkable.renderer.rules['glyph'] = this.glyph.bind(this);
}