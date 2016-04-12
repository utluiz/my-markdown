//ignores line (allows custom content like shortcodes)
//!! [embed]https://www.youtube.com/watch?v=SnAq9tbeRm4[/embed]
function escape_line_plugin(remarkable) {
    this.parseBlock = function(state, startLine, endLine, silent) {
        var pos = state.bMarks[startLine] + state.tShift[startLine],
            end = state.eMarks[startLine];

        if (pos > end || end - pos < 4) { return false; }
        if (state.src.charCodeAt(pos) !== 0x21/* ! */
            || state.src.charCodeAt(pos+1) !== 0x21/* ! */) { return false; }

        var escaped = state.src.slice(pos+2, end);
        if (!silent) {
            state.tokens.push({
                type: 'text',
                content: escaped,
                level: state.level
            });
        }
        state.line = startLine + 1;
        return true;
    };

    remarkable.block.ruler.before('paragraph', 'escape_line', this.parseBlock.bind(this));
}