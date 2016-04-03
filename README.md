TODO list:

1. Scroll brakes when document is scrolled in a way that both editor and preview are scrolled to
2. Links in preview do not have highlight removed on preview parent hover
3. Rename plugin and styles (wp-changed)
4. Check licensing info
5. Remove 3rd party dependencies and put on template shoulders:
 - Make prettify work from template
 - Update syntax highlighter? 
6. Remove unused configurations from plugin (be opinionated)
 - Check if it's possible disable markdown for posts
7. Make it possible extend markdown 
8. Review styles (CSS)
9. Organize scripts, styles, project configuration and minify them

Markdownify (PHP, generated Markdown from HTML)

    Updated from: https://github.com/Elephant418/Markdownify


Editor:

    - https://github.com/toopay/bootstrap-markdown
        See: http://www.codingdrama.com/bootstrap-markdown/

Markdown Editor (JavaScript, generates HTML)

    Using:
    - https://github.com/jmcmanus/pagedown-extra
    - https://github.com/balpha/pagedown

    Alternatives:
    - https://github.com/jonschlinkert/remarkable
        - https://jonschlinkert.github.io/remarkable/demo/
        - How to build a plugin
          - https://github.com/rlidwka/markdown-it-regexp/blob/698c6b35e44fbb6b925c25641e48e883f538c5d5/lib/index.js
          - https://github.com/jonschlinkert/remarkable/issues/48
        - Many options
    - https://github.com/chjj/marked
        - Allow customize tag renderers
        - Not straightforward way to add new rules

    - https://github.com/evilstreak/markdown-js
        - says it's extensible, but how?
        - not many options
        - old, but more used

    - https://github.com/arturadib/strapdown
        - just a wrapper for marked + editor

    - https://github.com/jbt/markdown-editor
    - https://github.com/benweet/stackedit/

DOM Diff

    - https://github.com/fiduswriter/diffDOM


Code prettify - Colorful code

    Google: https://github.com/google/code-prettify
    Used from CDN
    See: https://github.com/google/code-prettify/blob/master/docs/getting_started.md