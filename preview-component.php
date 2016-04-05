<template id="mmd-preview-template">
    <style>
        @import url("<?php echo plugin_dir_url(__FILE__); ?>css/editor-preview.css");
        @import url("<?php echo wp_get_theme()->get_template_directory_uri(); ?>/mmd-preview-editor.css");
    </style>
    <div class='mmd-preview-content prettyprint'></div>
</template>
<script>
    var mmd_template = document.currentScript.ownerDocument.querySelector('#mmd-preview-template');
    var mmdPreview = document.registerElement('mmd-preview', {
        prototype: Object.create(HTMLElement.prototype, {
            createdCallback: {
                value: function() {
                    var root = this.createShadowRoot();
                    var clone = document.importNode(mmd_template.content, true);
                    root.appendChild(clone);
                }
            },
            content: {
                value: function() {
                    return this.shadowRoot.querySelector('.mmd-preview-content').innerHTML;
                }
            },
            update: {
                value: function(content) {
                    this.shadowRoot.querySelector('.mmd-preview-content').innerHTML = content;
                    this.dispatchEvent(new CustomEvent('previewComponentUpdated', { detail: {
                        'element': this.shadowRoot.querySelector('.mmd-preview-content'),
                        'content': content
                    }}));
                    var changedElement = this.shadowRoot.querySelector('.wp-changed');
                    if (changedElement) {
                        this.dispatchEvent(new CustomEvent('previewComponentElementChanged', { detail: {
                            'element': changedElement
                        }}));
                    }
                }
            }
        })
    });
</script>