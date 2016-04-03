//remarkable plugin for captions in wordpress
//@[The MMM Book Cover Caption](http://luizricardo.org/wordpress/wp-content/upload-files/2015/05/mmm.jpg "Title")
function caption_plugin(remarkable, options) {

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

    this.caption_open = function(tokens, id, options, env) {
        return '<div class="wp-caption align' + tokens[id].alignment + '">';
    };

    this.caption_p_start = function(tokens, id, options, env) {
        return '<p class="wp-caption-text">';
    };
    this.caption_close = function(tokens, id, options, env) {
        return '</p></div>';
    };

    remarkable.inline.ruler.push(this.id, this.parse.bind(this));
    //remarkable.block.ruler.before('paragraph', this.id, this.parseBlock.bind(this));
    remarkable.renderer.rules['caption_open'] = this.caption_open.bind(this);
    remarkable.renderer.rules['caption_close'] = this.caption_close.bind(this);
    remarkable.renderer.rules['caption_p_start'] = this.caption_p_start.bind(this);
}

jQuery(document).ready(function($) {

    //force last execution otherwise the editor won't load
    $(document).ready(function() {

        var $editorPreview = $('<mmd-preview id="mmd-preview-component" class="mmd-panel mmd-preview"></mmd-preview>');
        var editorPreview = $editorPreview[0];
        var hiddenInput = $('<input type="hidden" id="mmd-htmlcontent" name="mmd-htmlcontent"/>"')

        function insert_content() {
            $('#content')
                .after($editorPreview)
                .after(hiddenInput);
            $('#ed_toolbar').html("<div id='mmd-button-barcontent'></div>");
        }

        function init_editor() {
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
        }

        function fix_height() {
            //both editor and preview with same size
            $editorPreview.height($('#content').height());
        }

        //main logic
        insert_content();
        init_editor();

        editorPreview.addEventListener('previewComponentUpdated', function(e) {
            fix_height();
        });

        editorPreview.addEventListener('previewComponentElementChanged', function(e) {
            //consider page
            console.log(e.detail.element.scrollTop)
            var top = e.detail.element.getBoundingClientRect().top + editorPreview.scrollTop - editorPreview.getBoundingClientRect().top - 50;
            $editorPreview.stop().animate({ scrollTop: top }, 500, function() {
                if (PR) {
                    PR.prettyPrint();
                }
            });
        });

        document.querySelector('#content').addEventListener('markdownEditorContentChanged', function(e) {
            var oldHtml = hiddenInput.val(); //last version from hidden input
            var newHtml = e.detail.html;
            if (oldHtml != newHtml) {
                hiddenInput.val(newHtml); //updates hidden input with the new html
                //changed event
                if (!editorPreview.content()) {
                    editorPreview.update(newHtml); //currently empty -> just put new value
                } else {
                    //compute diff
                    var wrapperOldHtml = document.createElement('div');
                    wrapperOldHtml.innerHTML = oldHtml;
                    var wrapperNewHtml = document.createElement('div');
                    wrapperNewHtml.innerHTML = newHtml;
                    var dd = new diffDOM();
                    var diff = dd.diff(wrapperOldHtml, wrapperNewHtml);
                    //apply diff
                    dd.apply(wrapperOldHtml, diff);
                    //updated preview component
                    editorPreview.update(wrapperOldHtml.innerHTML);
                }
            }
        });

        //first fix when loading
        setTimeout(fix_height, 100);
        editorPreview.update(hiddenInput.val());

        //fix auto_save adding HTML content to post data
        $(document).ajaxSend(function(event, jqxhr, settings) {
            if (settings.data && settings.data.indexOf("[wp_autosave]") >= 0) {
                settings.data +=  "&mmd-htmlcontent=" + encodeURIComponent(hiddenInput.val());
            }
        });

    });
});