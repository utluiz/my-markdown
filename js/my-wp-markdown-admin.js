//remarkable plugin
function caption_plugin(remarkable, options) {

    //[embed]https://www.youtube.com/watch?v=3rzvOqrtWIc[/embed]
    //<span class="embed-youtube" style="text-align:center; display: block;">
    // <iframe class="youtube-player" type="text/html" width="629" height="384" src="http://www.youtube.com/embed/3rzvOqrtWIc?version=3&amp;rel=1&amp;fs=1&amp;autohide=2&amp;showsearch=0&amp;showinfo=1&amp;iv_load_policy=1&amp;wmode=transparent" frameborder="0" allowfullscreen="true" data-origwidth="629" data-origheight="384" style="width: 629px; height: 384px;">
    // </iframe></span>

    var UNESCAPE_MD_RE = /\\([\\!"#$%&'()*+,.\/:;<=>?@[\]^_`{|}~-])/g;

    function unescapeMd(str) {
        if (str.indexOf('\\') < 0) { return str; }
        return str.replace(UNESCAPE_MD_RE, '$1');
    }

    //var parseLinkLabel       = require('../helpers/parse_link_label');
    function parseLinkLabel(state, start) {
        var level, found, marker,
            labelEnd = -1,
            max = state.posMax,
            oldPos = state.pos,
            oldFlag = state.isInLabel;

        if (state.isInLabel) { return -1; }

        if (state.labelUnmatchedScopes) {
            state.labelUnmatchedScopes--;
            return -1;
        }

        state.pos = start + 1;
        state.isInLabel = true;
        level = 1;

        while (state.pos < max) {
            marker = state.src.charCodeAt(state.pos);
            if (marker === 0x5B /* [ */) {
                level++;
            } else if (marker === 0x5D /* ] */) {
                level--;
                if (level === 0) {
                    found = true;
                    break;
                }
            }

            state.parser.skipToken(state);
        }

        if (found) {
            labelEnd = state.pos;
            state.labelUnmatchedScopes = 0;
        } else {
            state.labelUnmatchedScopes = level - 1;
        }

        // restore old state
        state.pos = oldPos;
        state.isInLabel = oldFlag;

        return labelEnd;
    };

    //var parseLinkDestination = require('../helpers/parse_link_destination');
    function parseLinkDestination(state, pos) {
        var code, level, link,
            start = pos,
            max = state.posMax;

        if (state.src.charCodeAt(pos) === 0x3C /* < */) {
            pos++;
            while (pos < max) {
                code = state.src.charCodeAt(pos);
                if (code === 0x0A /* \n */) { return false; }
                if (code === 0x3E /* > */) {
                    link = normalizeLink(unescapeMd(state.src.slice(start + 1, pos)));
                    if (!state.parser.validateLink(link)) { return false; }
                    state.pos = pos + 1;
                    state.linkContent = link;
                    return true;
                }
                if (code === 0x5C /* \ */ && pos + 1 < max) {
                    pos += 2;
                    continue;
                }

                pos++;
            }

            // no closing '>'
            return false;
        }

        // this should be ... } else { ... branch

        level = 0;
        while (pos < max) {
            code = state.src.charCodeAt(pos);

            if (code === 0x20) { break; }

            if (code > 0x08 && code < 0x0e) { break; }

            if (code === 0x5C /* \ */ && pos + 1 < max) {
                pos += 2;
                continue;
            }

            if (code === 0x28 /* ( */) {
                level++;
                if (level > 1) { break; }
            }

            if (code === 0x29 /* ) */) {
                level--;
                if (level < 0) { break; }
            }

            pos++;
        }

        if (start === pos) { return false; }

        link = unescapeMd(state.src.slice(start, pos));
        if (!state.parser.validateLink(link)) { return false; }

        state.linkContent = link;
        state.pos = pos;
        return true;
    };

    //var parseLinkTitle       = require('../helpers/parse_link_title');
    function parseLinkTitle(state, pos) {
        var code,
            start = pos,
            max = state.posMax,
            marker = state.src.charCodeAt(pos);

        if (marker !== 0x22 /* " */ && marker !== 0x27 /* ' */ && marker !== 0x28 /* ( */) { return false; }

        pos++;

        // if opening marker is "(", switch it to closing marker ")"
        if (marker === 0x28) { marker = 0x29; }

        while (pos < max) {
            code = state.src.charCodeAt(pos);
            if (code === marker) {
                state.pos = pos + 1;
                state.linkContent = unescapeMd(state.src.slice(start + 1, pos));
                return true;
            }
            if (code === 0x5C /* \ */ && pos + 1 < max) {
                pos += 2;
                continue;
            }

            pos++;
        }

        return false;
    };
    //var normalizeReference   = require('../helpers/normalize_reference');
    function normalizeReference(str) {
        // use .toUpperCase() instead of .toLowerCase()
        // here to avoid a conflict with Object.prototype
        // members (most notably, `__proto__`)
        return str.trim().replace(/\s+/g, ' ').toUpperCase();
    };
    //var utils = require('../common/utils');

    //this.parseBlock = function(state, startLine, endLine, silent) {
    this.parse = function(state, silent) {
        var labelStart,
            labelEnd,
            label,
            href,
            title,
            pos,
            ref,
            code,
            align = 'center',
            oldPos = state.pos,
            max = state.posMax,
            start = state.pos,
            marker = state.src.charCodeAt(start);

        if (marker !== 0x40/* @ */) return false;
        marker = state.src.charCodeAt(++start);
        if (marker !== 0x5B/* [ */) { return false; }
        if (state.level >= state.options.maxNesting) { return false; }

        labelStart = start + 1;
        labelEnd = parseLinkLabel(state, start);

        // parser failed to find ']', so it's not a valid link
        if (labelEnd < 0) { return false; }

        pos = labelEnd + 1;
        if (pos < max && state.src.charCodeAt(pos) === 0x28/* ( */) {
            //
            // Inline link
            //

            // [link](  <href>  "title"  )
            //        ^^ skipping these spaces
            pos++;
            for (; pos < max; pos++) {
                code = state.src.charCodeAt(pos);
                if (code !== 0x20 && code !== 0x0A) { break; }
            }
            if (pos >= max) { return false; }

            // [link](  <href>  "title"  )
            //          ^^^^^^ parsing link destination
            start = pos;
            if (parseLinkDestination(state, pos)) {
                href = state.linkContent;
                pos = state.pos;
            } else {
                href = '';
            }

            // [link](  <href>  "title"  )
            //                ^^ skipping these spaces
            start = pos;
            for (; pos < max; pos++) {
                code = state.src.charCodeAt(pos);
                if (code !== 0x20 && code !== 0x0A) { break; }
            }

            // [link](  <href>  "title"  )
            //                  ^^^^^^^ parsing link title
            if (pos < max && start !== pos && parseLinkTitle(state, pos)) {
                title = state.linkContent;
                pos = state.pos;

                // [link](  <href>  "title"  )
                //                         ^^ skipping these spaces
                for (; pos < max; pos++) {
                    code = state.src.charCodeAt(pos);
                    if (code !== 0x20 && code !== 0x0A) { break; }
                }
            } else {
                title = '';
            }

            if (pos >= max || state.src.charCodeAt(pos) !== 0x29/* ) */) {
                state.pos = oldPos;
                return false;
            }
            pos++;

        } else {
            //
            // Link reference
            //

            // do not allow nested reference links
            if (state.linkLevel > 0) { return false; }

            // [foo]  [bar]
            //      ^^ optional whitespace (can include newlines)
            for (; pos < max; pos++) {
                code = state.src.charCodeAt(pos);
                if (code !== 0x20 && code !== 0x0A) { break; }
            }

            if (pos < max && state.src.charCodeAt(pos) === 0x5B/* [ */) {
                start = pos + 1;
                pos = parseLinkLabel(state, pos);
                if (pos >= 0) {
                    label = state.src.slice(start, pos++);
                } else {
                    pos = start - 1;
                }
            }

            // covers label === '' and label === undefined
            // (collapsed reference link and shortcut reference link respectively)
            if (!label) {
                if (typeof label === 'undefined') {
                    pos = labelEnd + 1;
                }
                label = state.src.slice(labelStart, labelEnd);
            }

            ref = state.env.references[normalizeReference(label)];
            if (!ref) {
                state.pos = oldPos;
                return false;
            }
            href = ref.href;
            title = ref.title;
        }

        //optional center/right
        if (state.src.charCodeAt(pos) === 0x3C /* < */) {
            align = 'left';
            pos++;
        } else if (state.src.charCodeAt(pos) === 0x3E /* > */) {
            align = 'right';
            pos++;
        }

        //
        // We found the end of the link, and know for a fact it's a valid link;
        // so all that's left to do is to call tokenizer.
        //
        if (!silent) {
            state.pos = labelStart;
            state.posMax = labelEnd;

            state.push({
                type: 'caption_open',
                level: state.level++,
                alignment: align
            });
            state.tokens.push({
                type: 'link_open',
                href: href,
                title: title,
                level: state.level++
            });
            state.linkLevel++;
            state.tokens.push({
                type: 'image',
                src: href,
                title: title,
                alt: state.src.substr(labelStart, labelEnd - labelStart),
                level: state.level
            });
            state.linkLevel--;
            state.tokens.push({ type: 'link_close', level: --state.level });
            state.tokens.push({
                type: 'caption_p_start',
                tight: false,
                level: state.level
            });
            state.parser.tokenize(state);
            //state.tokens.push({
            //    type: 'inline',
            //    content: content,
            //    level: state.level + 1,
            //    children: []
            //});
            state.tokens.push({
                type: 'caption_close',
                tight: false,
                level: --state.level
            });
        }

        state.pos = pos;
        state.posMax = max;
        return true;
    };

    /*
    this.parse = function(state, silent) {
        //console.log(state);
        return false;

        if (state.pos + 5 > state.max) return false;

        var match = state.src.charAt(state.pos) == '@' && state.src.charAt(state.pos + 1) == '!';
        if (!match) return false;

        //find end of open caption shortcode
        var endBegin = state.src.indexOf("]", state.pos);
        var end = state.src.indexOf("[/caption]", state.pos);
        var nextBreak = state.src.indexOf("\n", state.pos);
        if (end < 0 || endBegin < 0 || end > nextBreak || endBegin < end) return false;

        //valid match found, now we need to advance cursor
        state.pos += end - state.pos + 10;

        // don't insert any tokens in silent mode
        if (silent) return true;

        //state.push({
        //    type: 'image',
        //    src: href,
        //    title: title,
        //    alt: state.src.substr(labelStart, labelEnd - labelStart),
        //    level: state.level
        //});

        state.push({
            type  : 'caption_open',
            level : state.level++,
            begin : state.src.slice(state.pos, endBegin)
        });
        state.parser.tokenize(state);
        state.push({
            type  : 'caption_open',
            level : --state.level,
            begin : state.src.slice(state.pos, endBegin)
        });
        var end = state.src.indexOf("[/caption]", state.pos);


        return true;
    };
*/
    this.caption_open = function(tokens, id, options, env) {

        return '<div class="wp-caption align' + tokens[id].alignment + '">';
    };

    this.caption_p_start = function(tokens, id, options, env) {
        return '<p class="wp-caption-text">';
    };
    this.caption_close = function(tokens, id, options, env) {
        return '</p></div>';
    };


    //@[The MMM Book Cover Caption](http://luizricardo.org/wordpress/wp-content/upload-files/2015/05/mmm.jpg "Title")
    remarkable.inline.ruler.push(this.id, this.parse.bind(this));
    //remarkable.block.ruler.before('paragraph', this.id, this.parseBlock.bind(this));
    remarkable.renderer.rules['caption_open'] = this.caption_open.bind(this);
    remarkable.renderer.rules['caption_close'] = this.caption_close.bind(this);
    remarkable.renderer.rules['caption_p_start'] = this.caption_p_start.bind(this);
}

jQuery(document).ready(function($) {

    //force last execution otherwise the editor won't load
    $(document).ready(function() {

        function insert_content() {
            $('#content')
                .after("<div id='wmd-previewcontent' class='wmd-panel wmd-preview prettyprint'></div>")
                .after('<input type="hidden" id="wmd-htmlcontent" name="wmd-htmlcontent"/>"');
            $('#ed_toolbar').html("<div id='wmd-button-barcontent'></div>");
        }

        function init_editor(refresh_callback) {
            var md = new Remarkable('full', {
                html: true,
                linkify: true,
                typographer: true
            });
            md.use(caption_plugin, {});
            var converter = {
                makeHtml: function(text) {
                    return md.render(text);
                }
            };
            var editor = new Markdown.Editor(converter, 'content');
            editor.run();
            editor.hooks.chain("onPreviewRefresh", refresh_callback);
        }

        function refresh_editor() {
            var pc = document.getElementById('wmd-previewcontent');
            var $pc = $(pc);
            //both editors with same height
            $pc.height($('#content').height());
            //scroll to changed content
            $pc.find('.wp-changed').first().each(function() {
                var node = this;
                setTimeout(function() {
                    var top = $(node).position().top + pc.scrollTop - document.body.scrollTop - 50;
                    //console.log($(this).position(), $(this).offset(), $pc.offset(), $pc.position(), top, document.body.scrollTop, pc.scrollTop);
                    $("#wmd-previewcontent").animate({ scrollTop: top }, 500, function() {
                        //node.scrollIntoView();
                    });
                }, 100);
            });

            //pretty print code blocks
            $('.wmd-preview pre').addClass('prettyprint');
            //re-run pretty-print
            if (typeof prettyPrint == 'function') {
                prettyPrint();
            } else if (PR.prettyPrint == 'function') {
                PR.prettyPrint();
            }
        }

        //main logic
        insert_content();
        init_editor(refresh_editor);
        setTimeout(refresh_editor, 100);

        //fix auto_save adding HTML content to post data
        $(document).ajaxSend(function(event, jqxhr, settings) {
            if (settings.data && settings.data.indexOf("[wp_autosave]") >= 0) {
                settings.data +=  "&wmd-htmlcontent=" + encodeURIComponent($('#wmd-htmlcontent').val());
            }
        });

    });
});