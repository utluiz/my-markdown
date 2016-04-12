jQuery(document).ready(function($) {

    //force last execution otherwise the editor won't load
    $(document).ready(function() {

        var $editorPreview = $('<mmd-preview id="mmd-preview-component" class="mmd-panel mmd-preview"></mmd-preview>');
        var editorPreview = $editorPreview[0];
        var hiddenInput = $('<input type="hidden" id="mmd-html-content" name="mmd-html-content"/>"')

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
            md.use(caption_plugin);
            md.use(escape_line_plugin);
            md.use(glyphs_plugin);
            md.use(bootstrap_blocks_plugin);
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
            var elementTopFromViewport = e.detail.element.getBoundingClientRect().top;
            var editorTopFromViewport = editorPreview.getBoundingClientRect().top;
            var position = elementTopFromViewport - editorTopFromViewport + editorPreview.scrollTop;
            var newTop = elementTopFromViewport + (editorPreview.scrollTop - position);
            var compensation = newTop < 100 ? 150 - newTop : 50;
            $editorPreview.stop().animate({ scrollTop: position - compensation }, 500);
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
            if (settings.data && settings.data.indexOf("wp_autosave") >= 0) {
                settings.data +=  "&mmd-html-content=" + encodeURIComponent(hiddenInput.val());
            }
        });

    });

});