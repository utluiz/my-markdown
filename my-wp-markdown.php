<?php
/*
Plugin Name: My WP-Markdown
Description: Allows you to use MarkDown
Version: 1.5.1
Author: Luiz Ricardo
*/

class WordPress_MyMarkdown {

	var $domain = 'mymarkdown';

	//Version
	static $version ='1.5.1';

	//Options and defaults
	static $options = array(
		'post_types'=>array(),
		'markdownbar'=>array(),
		'prettify'=>0,
	);
	static $option_types = array(
		'post_types'=>'array',
		'markdownbar'=>'array',
		'prettify'=>'checkbox',
	);
	
	public $kses_removed = false;

	public function __construct() {
		register_activation_hook(__FILE__,array(__CLASS__, 'install' )); 
		register_uninstall_hook(__FILE__,array( __CLASS__, 'uninstall' )); 
		add_action( 'init', array( $this, 'init' ) );
		add_action( 'set_current_user', array( $this, 'maybe_remove_kses' ), 99 );
        add_action( 'admin_init', array( $this, 'admin_init' ) );
	}

	static function install(){
		update_option("markdown_version",self::$version);
		add_option('markdown',self::$options);
	}

	static function uninstall(){
		delete_option("markdown_version");
		delete_option('markdown');
	}

	public function init() {
		add_filter('wp_insert_post_data', array( $this, 'wp_insert_post_data' ), 10, 2);
		$this->maybe_remove_kses();
		remove_filter( 'content_save_pre', 'balanceTags', 50 ); //Remove balanceTags and apply after MD -> HTML
		add_filter('edit_post_content', array($this, 'edit_post_content'), 10, 2);
		add_action('wp_enqueue_scripts', array($this,'register_scripts'));
		if( $this->get_option( 'prettify') ) {
			add_filter('the_content', array($this, 'the_content'));
        }
	}

	/**
	 * {@see wp_filter_post_kses()} strips out all HTML tags that are not explicitly allowed
	 * for the current user. But this runs before markdown is converted to HTML, meaning that some tags
	 * in code blocks are stripped out. We remove the filter, and conditionally at it back at `wp_insert_post_data`.
	 */
	function maybe_remove_kses(){
		if ( remove_filter( 'content_save_pre', 'wp_filter_post_kses' ) ) {
			$this->kses_removed = true;
		}
	}

	/*
	 * Settings
	 */
	function admin_init(){
		register_setting('writing',$this->domain, array($this,'validate'));
		add_settings_section( $this->domain.'_section', 'MarkDown', array($this,'settings'), 'writing'); 
		add_settings_field($this->domain.'_posttypes', __('Enable MarkDown for:', 'my-wp-markdown'), array($this,'settings_posttypes'), 'writing', $this->domain.'_section');
		add_settings_field($this->domain.'_markdownbar', __('Enable MarkDown help bar for:', 'my-wp-markdown'), array($this,'settings_markdownbar'), 'writing', $this->domain.'_section');
		add_settings_field($this->domain.'_prettify', __('Enable Prettify syntax highlighter:', 'my-wp-markdown'), array($this,'settings_prettify'), 'writing', $this->domain.'_section');

		add_filter('user_can_richedit', array($this,'can_richedit'), 99); //Remove html tab for markdown posts
		add_action('admin_enqueue_scripts', array($this,'admin_scripts'), 10, 1);
        add_action('wp_restore_post_revision', array($this, 'restore_revision'), 10, 2);
    }

	public function can_richedit($bool){
		$screen = get_current_screen();
		$post_type = $screen->post_type;
		if($this->is_Markdownable($post_type))
			return false;

		return $bool;
	}

	function settings(){
		//settings_fields('markdown'); 
		echo '<p>'.__("Select the post types or comments that will support Markdown. Comments can also feature a Markdown 'help bar' and previewer. Automatic syntax highlighting can be provided by <a href='http://code.google.com/p/google-code-prettify/' target='_blank'>Prettify</a>.",'my-wp-markdown' ).'</p>';
	}

	function settings_posttypes(){
		$options = get_option($this->domain);
		$savedtypes = (array) $options['post_types'];
		$types=get_post_types(array('public'   => true),'objects'); 
		unset($types['attachment']);

		$id = "id={$this->domain}_posttypes'";
		foreach ($types as $type){
			echo "<label><input type='checkbox' {$id} ".checked(in_array($type->name,$savedtypes),true,false)."name='{$this->domain}[post_types][]' value='$type->name' />{$type->labels->name}</label></br>";
		}
		echo "<label><input type='checkbox' {$id} ".checked(in_array('comment',$savedtypes),true,false)."name='{$this->domain}[post_types][]' value='comment' />Comments</label></br>";	
	}

	function settings_markdownbar(){
		$options = get_option($this->domain);
		$savedtypes = (array) $options['post_types'];
		$barenabled = isset($options['markdownbar']) ? $options['markdownbar']  : self::$options['markdownbar'];
		$id = "id={$this->domain}_markdownbar'";

		echo "<label><input type='checkbox' {$id} ".checked(in_array('posteditor',$barenabled),true,false)."name='{$this->domain}[markdownbar][]' value='posteditor' />". esc_html__( 'Post editor','my-wp-markdown' )."</label></br>";
		echo "<label><input type='checkbox' {$id} ".checked(in_array('comment',$barenabled)&&in_array('comment',$savedtypes),true,false)."name='{$this->domain}[markdownbar][]' value='comment' />".esc_html__('Comments','my-wp-markdown')."</label></br>";
	}

	function settings_prettify(){
		$options = get_option($this->domain);
		$checked = (int) $options['prettify'];
		$id = "id={$this->domain}_prettify'";
		echo "<input type='checkbox' {$id} ".checked($checked,true,false)."name='{$this->domain}[prettify]' value='1' />";
	}

	function validate($options){
		$clean = array();
		
		foreach (self::$options as $option => $default){
			if(self::$option_types[$option]=='array'){
				$clean[$option] = isset($options[$option]) ? array_map('esc_attr',$options[$option]) : $default;
			}elseif(self::$option_types[$option]=='checkbox'){
				$clean[$option] = isset($options[$option]) ? (int) $options[$option] : $default;
			}
		}

		return $clean;
	}

	/*
	* Function to determine if markdown has been enabled for the current post_type or comment
	* If an integer is passed it assumed to be a post (not comment) ID. Otherwise it assumed to be the
	* the post type or 'comment' to test.
	*
	* @param (int|string) post ID or post type name or 'comment'
	* @return (true|false). True if markdown is enabled for this post type. False otherwise.
	* @since 1.0
	*/
	function is_Markdownable($id_or_type){
		if(is_int($id_or_type))
			$type = get_post_type($id_or_type);
		else
			$type = esc_attr($id_or_type);

		$options = get_option($this->domain);
		$savedtypes = (array) $options['post_types'];

		return in_array($type,$savedtypes);
	}

	function is_bar_enabled($id_or_type){
		if(is_int($id_or_type))
			$type = get_post_type($id_or_type);
		else
			$type = esc_attr($id_or_type);

		$options = get_option($this->domain);
		$barenabled = (array) $options['markdownbar'];

		return in_array($type,$barenabled);
	}
	/*
	* Function to determine if prettify should be loaded
	*/
	function load_prettify(){
		if( !$this->get_option( 'prettify') ) 
			return false;

		$savedtypes = (array) $this->get_option( 'post_types' );

		return is_singular($savedtypes);
	}
	
	function get_option( $option ){
		$options = get_option($this->domain);
		if( !isset( $options[$option] ) )
			return false;
		
		return $options[$option];
	}

	public function wp_insert_post_data($data, $postarr) {
        error_log("wp_insert_post_data");
        //error_log("- DATA = " . print_r($data, true));
        //error_log("- POSTARR = " . print_r($postarr, true));
        //error_log("- POST = " . print_r($_POST, true));
        $content = $data['post_content'];
		if ($this->is_Markdownable($data['post_type'])) {
            error_log("- Saving Markdown and Converting");
            $data["post_content_filtered"] = $content;
            $content = $_POST['wmd-htmlcontent'];
            if (!$content) {
                return new WP_Error('nohtml', 'Fail to obtain HTML content!');
                //de("Fail to obtain HTML content!");
                //error_log("loading previous version");
                //$content = get_post((int) $_POST['data']['wp_autosave']['post_id'])->post_content_filtered;
            }
            //error_log($content);
            //error_log('**************');
            //error_log(do_shortcode($content));
            if (!$content) {
                return new WP_Error('nocontent', 'Fail to obtain HTML content!');
            }
            //de('no content');
		} else if ($data['post_type'] =='revision' && $this->is_Markdownable($data['post_parent'])) {
            error_log("Revision - parent:" . $data['post_parent']);
            $meta_markdown = get_post((int) $data['post_parent'])->post_content_filtered;
            $data["post_content_filtered"] = $meta_markdown;
            return $data;
        }

		//If we have removed kses - add it here
		if ($this->kses_removed) {
            $content = wp_filter_post_kses($content);
		}
		$data['post_content'] = balanceTags($content);
		return $data;
	}

    public function restore_revision($id, $revision_id) {
        //error_log("restore_revision $id / $revision_id");
        //de("restore");
        //var_dump("restore", $post_id, $revision_id);
        //de();
        //TODO update content with markdown. see https://github.com/Automattic/jetpack/blob/master/modules/markdown/easy-markdown.php
        return $id;
    }

	//Post content
	public function edit_post_content($content, $id) {
        error_log("edit_post_content $id");
        //var_dump("edit_post", $content, $id);
        //de();
		if ($this->is_Markdownable((int) $id)) {
            $meta_markdown = get_post((int) $id)->post_content_filtered;
            error_log("- loaded markdown:" . strlen($meta_markdown));
            error_log($meta_markdown);
            error_log("#-#-#-#-#");
			return $meta_markdown ? $meta_markdown : wpmarkdown_html_to_markdown($content);
		} else {
            return new WP_Error('nohtml', 'Fail to obtain HTML content!'); //di("sad");
        }
		return $content;
	}

	function register_scripts() {
		$plugin_dir = plugin_dir_url(__FILE__);
		//$min = (defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG) ? '' : '.min';
		
		wp_register_script('my-wp-markdown-diffdom', $plugin_dir . "js/diffDOM.js", array(), self::$version);
		wp_register_script('my-wp-markdown-converter', $plugin_dir . "js/pagedown/Markdown.Converter.js", array(), self::$version);
		wp_register_script('my-wp-markdown-sanitizer', $plugin_dir . "js/pagedown/Markdown.Sanitizer.js", array(), self::$version);
		wp_register_script('my-wp-markdown-extra', $plugin_dir . "js/pagedown/Markdown.Extra.js", array(), self::$version);
		wp_register_script('my-wp-markdown-editor', $plugin_dir . "js/pagedown/Markdown.Editor.js", array(), self::$version);
        wp_register_script('my-wp-markdown-remarkable', $plugin_dir . "js/remarkable.js", array(), self::$version);
        wp_register_script('my-wp-markdown-admin', $plugin_dir . "js/my-wp-markdown-admin.js", array(), self::$version, true);
		wp_register_script('my-wp-markdown-prettify', 'https://cdn.rawgit.com/google/code-prettify/master/loader/run_prettify.js', array(), self::$version, true);

		wp_register_style('my-wp-markdown-editor-style', $plugin_dir.'css/markdown-editor.css', array(), self::$version);

        wp_enqueue_script('my-wp-markdown-prettify');
	}

    function admin_scripts($hook) {
        //$screen = get_current_screen();
        //$post_type = $screen->post_type;
        if (('post-new.php' == $hook || 'post.php' == $hook)) {
            $this->register_scripts();
            wp_enqueue_script('my-wp-markdown-diffdom');
            wp_enqueue_script('my-wp-markdown-converter');
            wp_enqueue_script('my-wp-markdown-sanitizer');
            //wp_enqueue_script('my-wp-markdown-extra');
            wp_enqueue_script('my-wp-markdown-prettify');
            wp_enqueue_script('my-wp-markdown-editor');
            wp_enqueue_script('my-wp-markdown-remarkable');
            wp_enqueue_script('my-wp-markdown-admin');
            wp_enqueue_style('my-wp-markdown-editor-style');
        }
    }
	
	/**
	 * This ensures the prettify styles & scripts are in the queue 
	 * When on a home page prettify wont already have been queued.
	 */
	function the_content($content){
		$post_type = get_post_type();
		$post_types = $this->get_option( 'post_types' );
		if( $this->get_option( 'prettify') && in_array( $post_type, $post_types ) ){
			//wp_enqueue_style('my-wp-markdown-prettify');
			//wp_enqueue_script( 'my-wp-markdown' ); //Sets the prettify ball rolling.
		}
        wp_enqueue_script('my-wp-markdown-prettify');
		return $content;
	}

}


/**
 * Converts HTML into markdown
 * 
 * @param string $html
 * @return string markdown
 */
function wpmarkdown_html_to_markdown($html) {
	$converter = new Markdownify\ConverterExtra;
	return $converter->parseString($html);
}

/**
 * Converts markdown into HTML
 *
 * @param string $markdown
 * @return string HTML
 */
function wpmarkdown_markdown_to_html( $markdown ) {
    $parsedown = new Parsedown();
	return $parsedown->text($markdown);
}

require_once( dirname( __FILE__) . '/Parsedown.php' );
require_once( dirname( __FILE__) . '/markdownify/Parser.php' );
require_once( dirname( __FILE__) . '/markdownify/Converter.php' );
require_once( dirname( __FILE__) . '/markdownify/ConverterExtra.php' );

$markdown = new WordPress_MyMarkdown();
