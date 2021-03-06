<?php
// Copyright 2009 Simon Zerner, Toby Zerner
// This file is part of esoTalk. Please see the included license file for usage information.

// Feed view: outputs items specified by the feed controller in RSS format.

if (!defined("IN_ESOTALK")) exit;
?><?php echo "<?xml version='1.0' encoding='{$language["charset"]}'?>\n"; ?>
<rss version='2.0'>
	<channel>
		<title><?php echo $this->controller->title; ?></title>
		<link><?php echo sanitize($this->controller->link); ?></link>
		<description><?php echo $this->controller->description; ?></description>
		<pubDate><?php echo $this->controller->pubDate; ?></pubDate>
		<generator>esoTalk</generator>
<?php foreach ($this->controller->items as $item): ?>
		<item>
			<title><?php echo $item["title"]; ?></title>
			<link><?php echo sanitize($item["link"]); ?></link>
			<description><?php echo $item["description"]; ?></description>
			<pubDate><?php echo $item["date"]; ?></pubDate>
			<guid><?php echo sanitize($item["link"]); ?></guid>
		</item>
<?php endforeach; ?>
	</channel>
</rss>