#!/usr/bin/env python3
"""
Generate final clean OPML file and removed feeds report with updated results
"""

import json
import xml.etree.ElementTree as ET
from datetime import datetime

def create_clean_opml(working_feeds, original_opml_file, output_file):
    """Create a clean OPML file with only working feeds"""
    
    # Create new OPML structure
    opml = ET.Element('opml', version='1.0')
    head = ET.SubElement(opml, 'head')
    title = ET.SubElement(head, 'title')
    title.text = f"Keith subscriptions (cleaned {datetime.now().strftime('%Y-%m-%d')})"
    
    body = ET.SubElement(opml, 'body')
    
    # Group feeds by category
    feeds_by_category = {}
    for feed in working_feeds:
        category = feed['category']
        if category not in feeds_by_category:
            feeds_by_category[category] = []
        feeds_by_category[category].append(feed)
    
    # Create category outlines and add feeds
    for category_name, feeds in sorted(feeds_by_category.items()):
        category_outline = ET.SubElement(body, 'outline')
        category_outline.set('text', category_name)
        category_outline.set('title', category_name)
        
        for feed in feeds:
            feed_outline = ET.SubElement(category_outline, 'outline')
            feed_outline.set('type', 'rss')
            feed_outline.set('text', feed['title'])
            feed_outline.set('title', feed['title'])
            feed_outline.set('xmlUrl', feed['url'])
            feed_outline.set('htmlUrl', feed['html_url'])
    
    # Write to file with proper formatting
    tree = ET.ElementTree(opml)
    ET.indent(tree, space="    ")
    tree.write(output_file, encoding='UTF-8', xml_declaration=True)
    print(f"Clean OPML written to: {output_file}")

def create_removed_feeds_report(broken_feeds, output_file):
    """Create a text report of removed feeds with reasons"""
    
    with open(output_file, 'w') as f:
        f.write("RSS Feed Audit - Removed Feeds Report (Final)\n")
        f.write("=" * 55 + "\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total removed feeds: {len(broken_feeds)}\n\n")
        
        f.write("NOTE: This report includes only feeds that are genuinely broken.\n")
        f.write("8 feeds initially marked as broken were recovered as valid Atom feeds.\n\n")
        
        # Group by category
        feeds_by_category = {}
        for feed in broken_feeds:
            category = feed['category']
            if category not in feeds_by_category:
                feeds_by_category[category] = []
            feeds_by_category[category].append(feed)
        
        # Write by category
        for category, feeds in feeds_by_category.items():
            f.write(f"\n{category.upper()}\n")
            f.write("-" * len(category) + "\n")
            
            for feed in feeds:
                f.write(f"\nTitle: {feed['title']}\n")
                f.write(f"URL: {feed['url']}\n")
                f.write(f"HTML URL: {feed['html_url']}\n")
                f.write(f"Status Code: {feed['response_code']}\n")
                f.write(f"Content Type: {feed['content_type']}\n")
                f.write(f"Error: {feed['error']}\n")
        
        # Summary by error type
        f.write(f"\n\nSUMMARY BY ERROR TYPE\n")
        f.write("=" * 25 + "\n")
        
        error_counts = {}
        for feed in broken_feeds:
            error_type = feed['error']
            if error_type and 'HTTP' in error_type:
                error_key = f"HTTP {feed['response_code']}"
            elif error_type and 'Invalid XML' in error_type:
                error_key = "Invalid XML"
            elif error_type and 'Timeout' in error_type:
                error_key = "Timeout"
            elif error_type and 'Connection error' in error_type:
                error_key = "Connection error"
            elif error_type and 'Empty response' in error_type:
                error_key = "Empty response"
            else:
                error_key = "Other"
            
            error_counts[error_key] = error_counts.get(error_key, 0) + 1
        
        for error_type, count in sorted(error_counts.items()):
            f.write(f"{error_type}: {count} feeds\n")
    
    print(f"Removed feeds report written to: {output_file}")

def create_working_feeds_list(working_feeds, output_file):
    """Create a text list of working feeds"""
    
    with open(output_file, 'w') as f:
        f.write("RSS Feed Audit - Working Feeds List\n")
        f.write("=" * 40 + "\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total working feeds: {len(working_feeds)}\n\n")
        
        # Group by category
        feeds_by_category = {}
        for feed in working_feeds:
            category = feed['category']
            if category not in feeds_by_category:
                feeds_by_category[category] = []
            feeds_by_category[category].append(feed)
        
        # Write by category
        for category, feeds in sorted(feeds_by_category.items()):
            f.write(f"\n{category.upper()} ({len(feeds)} feeds)\n")
            f.write("-" * (len(category) + len(f" ({len(feeds)} feeds)")) + "\n")
            
            for feed in feeds:
                f.write(f"✓ {feed['title']}\n")
                f.write(f"  RSS: {feed['url']}\n")
                f.write(f"  Web: {feed['html_url']}\n\n")
    
    print(f"Working feeds list written to: {output_file}")

def main():
    # Load updated audit results
    with open('/Users/kstenson/src/rss-reader/audit_results_updated.json', 'r') as f:
        results = json.load(f)
    
    working_feeds = results['working_feeds']
    broken_feeds = results['broken_feeds']
    
    print(f"Processing {len(working_feeds)} working feeds and {len(broken_feeds)} broken feeds")
    
    # Create clean OPML
    create_clean_opml(
        working_feeds,
        '/Users/kstenson/src/rss-reader/feeds.opml',
        '/Users/kstenson/src/rss-reader/feeds_clean_final.opml'
    )
    
    # Create removed feeds report
    create_removed_feeds_report(
        broken_feeds,
        '/Users/kstenson/src/rss-reader/removed_feeds_final.txt'
    )
    
    # Create working feeds list
    create_working_feeds_list(
        working_feeds,
        '/Users/kstenson/src/rss-reader/working_feeds_list.txt'
    )
    
    print("\nAll files created successfully!")
    print(f"Final summary: {len(working_feeds)} working feeds, {len(broken_feeds)} broken feeds")

if __name__ == "__main__":
    main()