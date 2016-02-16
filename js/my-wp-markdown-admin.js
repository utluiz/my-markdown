jQuery(document).ready(function($) {

    function insert_content() {
        $('#content')
            .after("<div id='wmd-previewcontent' class='wmd-panel wmd-preview prettyprint'></div>")
            .after('<input type="hidden" id="wmd-htmlcontent" name="wmd-htmlcontent"/>"');
        $('#ed_toolbar').html("<div id='wmd-button-barcontent'></div>");
    }

    function init_editor() {
        var md = new Remarkable('full', {
            html: true,
            linkify: true,
            typographer: true
        });
        var converter = {
            makeHtml: function(text) {
                return md.render(text);
            }
        };
        var editor = new Markdown.Editor(converter, 'content');
        editor.run();
        $('.wmd-preview pre').addClass('prettyprint');
        if (typeof prettyPrint == 'function') {
            prettyPrint();
        } else if (PR.prettyPrint == 'function') {
            PR.prettyPrint();
        }
    }

	insert_content();
    init_editor();


	$('#wmd-previewcontent').height(jQuery('#content').height());
	editor.hooks.chain("onPreviewRefresh", function () {
		$('#wmd-previewcontent').height($('#content').height());
		$('.wmd-preview pre').addClass('prettyprint');
		if (typeof prettyPrint == 'function') {
			prettyPrint();
		} else if (PR.prettyPrint == 'function') {
			PR.prettyPrint();
		}
		$('#wmd-htmlcontent').val($('#wmd-previewcontent').html());
	});
	$('#wmd-htmlcontent').val($('#wmd-previewcontent').html());
});