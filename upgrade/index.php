<?php
// Copyright 2009 Simon Zerner, Toby Zerner
// This file is part of esoTalk. Please see the included license file for usage information.

// Upgrader: this page is loaded whenever the build esoTalk version in config.default.php differs from the one the forum
// is up-to-date with (in config.php). Sets up the Upgrade controller.

define("IN_ESOTALK", 1);

// No timeout
@set_time_limit(0);

// Get the new version and the current version, and compare them. If we don't need to upgrade, home we go!
require "../config.default.php";
require "../config/versions.php";
if ($versions["esoTalk"] == ESOTALK_VERSION) {
	header("Location: ../index.php");
	exit;
}

// Require essential files.
require "../lib/functions.php";
require "../lib/database.php";
require "../config/config.php";
require "upgrade.controller.php";

// Undo register_globals.
undoRegisterGlobals();

// If magic quotes is on, strip the slashes that it added.
if (get_magic_quotes_gpc()) {
	$_GET = array_map("undoMagicQuotes", $_GET);
	$_POST = array_map("undoMagicQuotes", $_POST);
	$_COOKIE = array_map("undoMagicQuotes", $_COOKIE);
}

// Sanitize the request data. This is pretty much the same as using htmlentities. 
$_POST = sanitize($_POST);
$_GET = sanitize($_GET);
$_COOKIE = sanitize($_COOKIE);

// Set up the upgrade controller and start the upgrade.
$upgrade = new Upgrade();
$upgrade->init();

?>