# My Markdown

## Existent posts

Auto-convert to Markdown using LGPL PHP library [Markdownify](https://github.com/Elephant418/Markdownify).

## Editor

Toolbar and shortcut keys using [Pagedown](https://github.com/balpha/pagedown) and [Pagedown-Extra](https://github.com/jmcmanus/pagedown-extra)
similar to Stack Overflow.

## HTML generation

Conversion to HTML using MIT JavaScript library [Remarkable](https://github.com/jonschlinkert/remarkable) and custom plugin. 

Generated HTML is sent to server, so no dubious conversion.

## Preview

Changes are incrementally applied to preview window using LGPL JavaScript library [diffDOM](https://github.com/fiduswriter/diffDOM),
highlighting elements affected by each change in Markdown code.

## Disabling editor

Disable editor for specific posts and pages adding a custom field named `my-markdown-disabled` with some value like `1` or `true`.

# TODO

- Configure project properly to minify code
- Make it possible to extend markdown without changing the plugin (?) 

