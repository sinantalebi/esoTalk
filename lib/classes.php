<?php
// Copyright 2010 Toby Zerner, Simon Zerner
// This file is part of esoTalk. Please see the included license file for usage information.

// Classes: This file contains all base classes which are extended throughout esoTalk...

// Hookable - a class in which code can be hooked on to.
// Controller (extends Hookable) - a class which defines a view and handles input.
// Plugin (extends Hookable) - a class which defines a plugin.
// Skin - defines a skin.

if (!defined("IN_ESOTALK")) exit;


class Factory {
	
var $classNames = array(
	"Database" => array("Database", "lib/database.php"),
	"Formatter" => array("Formatter", "lib/formatter.php"),
	"conversation" => array("ConversationController", "controllers/conversation.controller.php"),
	"esoTalk" => array("esoTalkController", "controllers/esoTalk.controller.php"),
	"feed" => array("FeedController", "controllers/feed.controller.php"),
	"forgot-password" => array("ForgotPasswordController", "controllers/forgot-password.controller.php"),
	"join" => array("JoinController", "controllers/join.controller.php"),
	"online" => array("OnlineController", "controllers/online.controller.php"),
	"admin" => array("AdminController", "controllers/admin.controller.php"),
	"post" => array("PostController", "controllers/post.controller.php"),
	"profile" => array("ProfileController", "controllers/profile.controller.php"),
	"search" => array("SearchController", "controllers/search.controller.php"),
	"settings" => array("SettingsController", "controllers/settings.controller.php"),
);

function &make($class)
{
	if (!class_exists($this->classNames[$class][0])) require $this->classNames[$class][1];
	$object = new $this->classNames[$class][0];
	$object->className = $this->classNames[$class][0];
	return $object;
}

function register($class, $className, $file)
{
	$this->classNames[$class] = array($className, $file);
}

}

// Hookable - a class in which code can be hooked on to.
// Extend this class and then use $this->fireEvent("uniqueMarker") in the class code to call any code which has been
// hooked via $classInstance->addHook("uniqueMarker", "function").
class Pluggable {
	
var $className;

function fireEvent($event, $parameters = array(), $return = false)
{
	global $esoTalk;
	// Add the instance of this class to the parameters.
	// We can't use array_unshift here because call-time pass-by-reference has been deprecated.
	$parameters = is_array($parameters) ? array_merge(array(&$this), $parameters) : array(&$this);
	foreach ($esoTalk->plugins as $plugin) {
		if (method_exists($plugin, "Handler_{$this->className}_$event"))
			// Loop through the functions which have been hooked on this hook and execute them.
			// If this hook requires a return value and the function we're running returns something, return that.
			if (($returned = call_user_func_array(array($plugin, "Handler_{$this->className}_$event"), $parameters)) and $return) return $returned;
	}
}


}


// Controller (extends Pluggable) - a class which defines a view and handles input.
// Extend this class and then use $esoTalk->registerController() to register your new controller.
class Controller extends Pluggable {

var $action;
var $view;
var $title;
var $esoTalk;

function init() {}
function ajax() {}

// Render the page according to the controller's $view.
function render()
{
	global $language, $messages, $config;
	include $this->esoTalk->skin->getView($this->view);
}

}


// Plugin (extends Pluggable) - a class which defines a plugin.
// Extend this class to make a plugin. See the plugin documentation for more information.
class Plugin extends Pluggable {

var $id;
var $name;
var $version;
var $author;
var $description;

// Constructor: include the config file or write the default config if it doesn't exist.
function Plugin()
{
	if (!empty($this->defaultConfig)) {
		global $config;
		$filename = sanitizeFileName($this->id);
		if (!file_exists("config/$filename.php")) writeConfigFile("config/$filename.php", '$config["' . escapeDoubleQuotes($this->id) . '"]', $this->defaultConfig);
		include "config/$filename.php";
	}
}

// For automatic version checking, call this function (parent::init()) at the beginning of a plugin's init() function.
function init()
{
	// Compare the version of the code ($this->version) to the installed one (config/versions.php).
	// If it's different, run the upgrade() function, and write the new version number to config/versions.php.
	global $versions;
	if (!isset($versions[$this->id]) or $versions[$this->id] != $this->version) {
		$this->upgrade(@$versions[$this->id]);
		$versions[$this->id] = $this->version;
		writeConfigFile("config/versions.php", '$versions', $versions);	
	}
}

function settings() {}
function saveSettings() {}
function upgrade() {}
function enable() {}

}


// Skin - defines a skin.
// Extend this class to make a skin.
class Skin {

var $name;
var $version;
var $author;
var $views;

function init() {}

// Generate button HTML.
function button($attributes)
{
	$attr = " type='submit'";
	foreach ($attributes as $k => $v) $attr .= " $k='$v'";
	return "<input$attr/>";
}

// Register a custom view.
// Whenever a controller attempts to include $view, this new $file associated with $view will be included instead.
function registerView($view, $file)
{
	$this->views[$view] = $file;
}

function getView($view)
{
	return empty($this->views[$view]) ? "views/$view" : $this->views[$view];
}

function getForumLogo()
{
	global $config;
	return !empty($config["forumLogo"]) ? $config["forumLogo"] : "skins/{$config["skin"]}/logo.gif";
}

}

?>