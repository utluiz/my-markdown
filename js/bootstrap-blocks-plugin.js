//Bootstrap blocks:
//<<<well:well-lg
// *content* here
//>>>
function bootstrap_blocks_plugin(remarkable) {
    this.parseBlock = function(state, startLine, endLine, silent) {
        var pos = state.bMarks[startLine] + state.tShift[startLine],
            end = state.eMarks[startLine];

        if (pos > end || end - pos < 5) { return false; }
        if (state.src.charCodeAt(pos) !== 0x3C/* < */
            || state.src.charCodeAt(pos+1) !== 0x3C/* < */
            || state.src.charCodeAt(pos+2) !== 0x3C/* < */) { return false; }

        var parts = state.src.slice(pos+3, end).split(/:/);
        var type = parts[0];
        var classes = parts.length > 1 ? parts[1] : '';

        if (type !== 'well' && type !== 'alert') { return false; }

        var endLineBlock = 0;
        for (var i = startLine + 1; i <= endLine; i++) {
            var lpos = state.bMarks[i] + state.tShift[i],
                lend = state.eMarks[i];
            if (lend - lpos < 3) continue;
            if (state.src.charCodeAt(lpos) === 0x3E/* > */
                && state.src.charCodeAt(lpos+1) === 0x3E/* > */
                && state.src.charCodeAt(lpos+2) === 0x3E/* > */) {
                endLineBlock = i;
                break;
            }
        }
        if (!endLineBlock) { return false; }

        if (!silent) {
            state.tokens.push({
                type: type + '_open',
                classes: classes,
                level: state.level++
            });
            state.parser.tokenize(state, startLine + 1, endLineBlock);
            state.tokens.push({
                type: type + '_close',
                classes: classes,
                level: --state.level
            });
        }
        state.line = endLineBlock + 1;
        return true;
    };

    this.well_open = function(tokens, id, options, env) {
        return '<div class="well ' + tokens[id].classes + '">';
    };
    this.well_close = function(tokens, id, options, env) {
        return '</div>';
    };
    this.alert_open = function(tokens, id, options, env) {
        var classes = tokens[id].classes ? tokens[id].classes : 'info';
        if (classes === 'success' || classes === 'info' || classes === 'warning' || classes === 'danger') {
            classes = 'alert-' + classes;
        }
        return '<div class="alert ' + classes + '">';
    };
    this.alert_close = function(tokens, id, options, env) {
        return '</div>';
    };

    remarkable.block.ruler.before('paragraph', 'escape_line', this.parseBlock.bind(this));
    remarkable.renderer.rules['well_open'] = this.well_open.bind(this);
    remarkable.renderer.rules['well_close'] = this.well_close.bind(this);
    remarkable.renderer.rules['alert_open'] = this.alert_open.bind(this);
    remarkable.renderer.rules['alert_close'] = this.alert_close.bind(this);
}