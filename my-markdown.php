<?php
/*
Plugin Name: My Markdown
Description: Markdown editor with faithful preview
Version: 1.0.0
Author: Luiz Ricardo
Author URI: http://luizricardo.org
License: MIT
*/

require_once(dirname(__FILE__) . '/markdownify/Parser.php');
require_once(dirname(__FILE__) . '/markdownify/Converter.php');
require_once(dirname(__FILE__) . '/markdownify/ConverterExtra.php');

class WordPress_MyMarkdown {

	static $version ='1.0.0';
    static $options = array(
        'preview_css' => ''
    );
	var $domain = 'my-markdown';
    var $is_markdownable_cache = array();

    /* SETUP ------------------------------------------------------------------------------ */

    public function __construct() {
		register_activation_hook(__FILE__,array(__CLASS__, 'install'));
		register_uninstall_hook(__FILE__,array(__CLASS__, 'uninstall'));
        add_action('admin_init', array($this, 'admin_init'));
	}

	static function install() {
		update_option("my_markdown_version", self::$version);
		add_option('my_markdown_options', self::$options);
	}

	static function uninstall() {
		delete_option("my_markdown_version");
		delete_option('my_markdown_options');
	}

    public function admin_init() {
        add_action('admin_head', array($this, 'admin_header'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_resources'), 10);
		add_action('wp_ajax_mmd_preview_component', array($this, 'render_preview_component'));

        add_filter('edit_post_content', array($this, 'edit_post_content'), 10, 2);
        add_filter('wp_insert_post_data', array($this, 'post_data'), 10, 2);
        add_filter('user_can_richedit', array($this, 'remove_richedit'), 99);

        register_setting('writing', $this->domain, array($this, 'sanitize'));
        add_settings_section('mmd_section', 'MarkDown', array($this, 'settings'), 'writing');
        add_settings_field('mmd_preview_css', __('Additional CSS for preview:', $this->domain), array($this, 'settings_preview_css'), 'writing', 'mmd_section');
        add_settings_field('mmd_global_css', __('Global CSS for preview:', $this->domain), array($this, 'settings_global_css'), 'writing', 'mmd_section');
        add_settings_field('mmd_preview_js', __('Additional JavaScript for preview:', $this->domain), array($this, 'settings_preview_js'), 'writing', 'mmd_section');

        remove_filter('content_save_pre', 'balanceTags', 50);
        kses_remove_filters();
    }

    /**
     * Render header tag to import preview Web Component
     */
	public function admin_header() {
		if ($this->is_post_editor()) {
			echo '<link rel="import" href="' . admin_url('admin-ajax.php') . '?action=mmd_preview_component">';
            $options = get_option($this->domain);
            $global_css = $options && array_key_exists('mmd_global_css', $options) ? $options['mmd_global_css'] : '';
            echo "<style>\n$global_css\n</style>";
		}
	}

    /**
     * Add editor resources (Scripts and Styles)
     */
    public function enqueue_admin_resources() {
        //$min = (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) ? '' : '.min';
        if ($this->is_post_editor() && $this->is_markdownable()) {
            $plugin_dir = plugin_dir_url(__FILE__);

            wp_register_script('my-markdown-diffdom', $plugin_dir . "js/diffDOM/diffDOM.js", array(), self::$version);
            wp_register_script('my-markdown-converter', $plugin_dir . "js/pagedown/Markdown.Converter.js", array(), self::$version);
            wp_register_script('my-markdown-sanitizer', $plugin_dir . "js/pagedown/Markdown.Sanitizer.js", array(), self::$version);
            wp_register_script('my-markdown-extra', $plugin_dir . "js/pagedown-extra/Markdown.Extra.js", array(), self::$version);
            wp_register_script('my-markdown-editor', $plugin_dir . "js/pagedown/Markdown.Editor.js", array(), self::$version);
            wp_register_script('my-markdown-remarkable', $plugin_dir . "js/remarkable/remarkable.js", array(), self::$version);
            wp_register_script('my-markdown-remarkable-public', $plugin_dir . "js/remarkable/remarkable-public.js", array(), self::$version);
            wp_register_script('my-markdown-caption-plugin', $plugin_dir . "js/caption-plugin.js", array(), self::$version);
            wp_register_script('my-markdown-escape-line-plugin', $plugin_dir . "js/escape-line-plugin.js", array(), self::$version);
            wp_register_script('my-markdown-glyphs-plugin', $plugin_dir . "js/glyphs-plugin.js", array(), self::$version);
            wp_register_script('my-markdown-bootstrap-blocks-plugin', $plugin_dir . "js/bootstrap-blocks-plugin.js", array(), self::$version);
            wp_register_script('my-markdown-admin', $plugin_dir . "js/my-markdown-admin.js", array(), self::$version);

            wp_enqueue_script('my-markdown-diffdom');
            wp_enqueue_script('my-markdown-converter');
            wp_enqueue_script('my-markdown-sanitizer');
            wp_enqueue_script('my-markdown-editor');
            wp_enqueue_script('my-markdown-remarkable');
            wp_enqueue_script('my-markdown-remarkable-public');
            wp_enqueue_script('my-markdown-caption-plugin');
            wp_enqueue_script('my-markdown-escape-line-plugin');
            wp_enqueue_script('my-markdown-glyphs-plugin');
            wp_enqueue_script('my-markdown-bootstrap-blocks-plugin');
            wp_enqueue_script('my-markdown-admin');

            wp_register_style('my-markdown-editor-style', $plugin_dir.'css/markdown-editor.css', array(), self::$version);
            wp_enqueue_style('my-markdown-editor-style');
        }
    }

    /**
     * Remove default WYSIWYG editor
     */
	public function remove_richedit() {
		return !$this->is_markdownable();
	}

    /**
     * Called in an Ajax call to render a Web Component HTML for preview panel in editor.
     */
    public function render_preview_component() {
        require_once(dirname(__FILE__) . '/preview-component.php');
        wp_die();
    }

    /* ADMIN SETTINGS ------------------------------------------------------------------------------ */

	function settings() {
		//echo '<p>'.__("My Markdown settings", 'my-markdown').'</p>';
	}

	function settings_preview_css() {
		$options = get_option($this->domain);
		$preview_css = $options && array_key_exists('mmd_preview_css', $options) ? $options['mmd_preview_css'] : '';
        echo "<textarea id='mmd_preview_css' name='my-markdown[mmd_preview_css]' rows='10' class='large-text'>" . esc_html__($preview_css) . "</textarea><br/>";
	}

	function settings_global_css() {
		$options = get_option($this->domain);
		$global_css = $options && array_key_exists('mmd_global_css', $options) ? $options['mmd_global_css'] : '';
        echo "<textarea id='mmd_global_css' name='my-markdown[mmd_global_css]' rows='10' class='large-text'>" . esc_html__($global_css) . "</textarea><br/>";
	}

	function settings_preview_js() {
		$options = get_option($this->domain);
		$preview_js = $options && array_key_exists('mmd_preview_js', $options) ? $options['mmd_preview_js'] : '';
        echo "<textarea id='mmd_preview_js' name='my-markdown[mmd_preview_js]' rows='10' class='large-text'>" . esc_html__($preview_js) . "</textarea><br/>";
	}

	function sanitize($options) {
		return $options;
	}

    /* UTILS ------------------------------------------------------------------------------ */

    /**
     * Allow easily enabling logging for debugging purposes.
     * @param $text
     * @param null $object
     */
    static function log($text, $object = null) {
        //error_log($text . ($object ? ' => ' . print_r($object, true) : ''));
    }

    /**
     * Return current post being edited
     * @return int
     */
    function get_post_id() {
        if (array_key_exists('post', $_GET)) return (int) $_GET['post'];
        if (array_key_exists('post_ID', $_POST)) return (int) $_POST['post_ID'];
        if (array_key_exists('ID', $_POST)) return (int) $_POST['ID'];
        if ($this->is_autosave_request()) return (int) $_POST['data']['wp_autosave']['post_id'];
        return 0;
    }

    /**
     * Check whether current page is a post or page edit page.
     * @return bool
     */
    function is_post_editor() {
        return get_current_screen()->base === 'post';
    }

    /**
     * Check whether is new-post.php (creating a new post)
     * @return bool
     */
    function is_new_post() {
        return get_current_screen()->action === 'add';
    }

    /**
     * Check whether is a Auto Save Ajax request
     * @return bool
     */
    function is_autosave_request() {
        return defined('DOING_AUTOSAVE') && DOING_AUTOSAVE;
    }

    function get_request_action() {
        return array_key_exists('action', $_GET) ? $_GET['action'] : array_key_exists('action', $_POST) ? $_POST['action'] : '';
    }

    /**
     * Check whether is a Revision Restore request
     * @return bool
     */
    function is_restore_request() {
        return $this->get_request_action() === 'restore';
    }

    /**
     * Check whether is a post revision being handled
     * @return bool
     */
    function is_post_revision() {
        return array_key_exists('post_type', $_POST) ? $_POST['post_type'] === 'revision' : false;
    }

    /**
     * Check whether is an Heartbeat auto save request
     * @return bool
     */
    function is_heartbeat_request() {
        return $this->get_request_action() === 'heartbeat';
    }

    /**
     * Check whether is an post update request
     * @return bool
     */
    function is_postedit_request() {
        return $this->get_request_action() === 'editpost';
    }

    /**
     * Check whether is an update preview request
     * @return bool
     */
    function is_preview_update() {
        return array_key_exists('wp-preview', $_POST) ? $_POST['wp-preview'] === 'dopreview' : false;
    }

    /**
     * Determine whether Markdown is enabled for current post.
     * @param int|Post $id Post id or empty. It'll try to get from current request.
     * @return bool
     */
	function is_markdownable($id = 0) {
        $id = ((int) $id) ?: $this->get_post_id();
        if (!array_key_exists($id, $this->is_markdownable_cache)) {
            $this->is_markdownable_cache[$id] = ($id ? !get_post_meta($id, 'my-markdown-disabled', true) : true);
            $this->log($id, $this->is_markdownable_cache);
        }
        return $this->is_markdownable_cache[$id];
	}

    /**
     * Convert HTML into Markdown. Used when editing existing content created without this plugin.
     * It's faulty but better than doint it 100% manually.
     *
     * @param string $html
     * @return string markdown
     */
    function html_to_markdown($html) {
        $converter = new Markdownify\ConverterExtra;
        return $converter->parseString($html);
    }

    /* POST PROCESSING ------------------------------------------------------------------------------ */

    /**
     * Triggered when a post was submitted. It means:
     * - Creating a new post
     * - Auto save (Ajax)
     * - Draft save
     * - Publishing
     * - Updating
     * - Restoring a revision
     * - Previewing update
     */
	public function post_data($data, $postarr) {
        $this->log("################# wp_insert_post_data", $data);
        $this->log("GET", $_GET);
        $this->log("POST", $_POST);

        if (!$this->is_restore_request() && !$this->is_heartbeat_request() && !$this->is_postedit_request()) {
            return $data;
        }

        if ($this->is_restore_request()) {
            $revision_id = (int) $_GET['revision'];
            $revision = get_post($revision_id);
            $this->log('restoring revision ' . $revision_id, $revision);
            if ($this->is_markdownable($revision->post_parent)) {
                $content = $revision->post_content;
                $html_content = $revision->post_content_filtered;
                if ($content && !$html_content) {
                    $html_content = $this->html_to_markdown($content);
                }
                $data['post_content_filtered'] = $html_content;
            } else {
                $this->log('No markdown enabled for revision?!');
            }
        } else if (!$this->is_preview_update() &&  $this->is_post_revision()) {
            if ($this->is_markdownable($data['post_parent'])) {
                $parent = get_post((int) $data['post_parent']);
                $this->log("Revision - parent", $parent);
                $data['post_content_filtered'] = $parent->post_content_filtered;
            } else {
                //restore markdown?
                $this->log('saving revision');
            }
        } else if ($this->is_markdownable()) {
            $content = $data['post_content'];
            $html_content = $_POST['mmd-html-content'];
            if ($html_content) {
                $this->log("Saving markdown and HTML");
                $data['post_content_filtered'] = $content;
                $data['post_content'] = $html_content;
            } else if ($content) {
                $this->log('Failed to obtain HTML content!');
                throw new WP_Error('nohtml', 'Failed to obtain HTML content!');
            }
        } else {
            $this->log('No markdown enabled!');
        }

        $this->log('------ END -------');
        return $data;
	}

    /**
     * Event that loads post content. Should load "filtered content" with markdown.
     * @param $content
     * @param $id
     * @return string
     */
	public function edit_post_content($content, $id) {
        $this->log("edit_post_content id=$id");
		if ($this->is_markdownable($id)) {
            $meta_markdown = get_post((int) $id)->post_content_filtered;
			return $meta_markdown ? $meta_markdown : $this->html_to_markdown($content);
		} else {
		    return $content;
        }
	}

}

$markdown = new WordPress_MyMarkdown();
