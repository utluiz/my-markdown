# My Markdown

TODO list:

- BUG: Scroll brakes when document is scrolled in a way that both editor and preview are scrolled to
- BUG: Links in preview do not have highlight removed on preview parent hover
- Rename plugin and styles (wp-changed)
- Check licensing info
- Remove 3rd party dependencies and put on template shoulders:
  - Make prettify work from template
  - Update syntax highlighter? 
- Remove unused configurations from plugin (be opinionated)
  - Check if it's possible disable markdown for posts
- Make it possible extend markdown without changing the plugin (?) 
- Review styles (CSS)
- Organize scripts, styles, project configuration and minify them
- Rename plugin properly
- Limit effect on WP Admin only when really editing a post or page
- Allow disabling for specific posts or pages?
- enable mbstring in PHP 7

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