#!/usr/bin/env python3
"""
Generate clean OPML file and removed feeds report from audit results
"""

import json
import xml.etree.ElementTree as ET
from datetime import datetime

def create_clean_opml(working_feeds, original_opml_file, output_file):
    """Create a clean OPML file with only working feeds"""
    
    # Parse original OPML to preserve structure
    tree = ET.parse(original_opml_file)
    root = tree.getroot()
    
    # Get all category outlines (parent elements)
    categories = {}
    for outline in root.findall('.//outline'):
        if outline.get('text') and not outline.get('xmlUrl'):
            # This is a category outline
            categories[outline.get('text')] = outline
    
    # Clear all child outlines from categories
    for category_outline in categories.values():
        category_outline.clear()
        # Restore attributes
        for key, value in category_outline.attrib.items():
            category_outline.set(key, value)
    
    # Add working feeds back to appropriate categories
    feeds_by_category = {}
    for feed in working_feeds:
        category = feed['category']
        if category not in feeds_by_category:
            feeds_by_category[category] = []
        feeds_by_category[category].append(feed)
    
    # Remove empty categories and add feeds to remaining ones
    categories_to_remove = []
    for category_name, category_outline in categories.items():
        if category_name in feeds_by_category:
            # Add feeds to this category
            for feed in feeds_by_category[category_name]:
                feed_outline = ET.SubElement(category_outline, 'outline')
                feed_outline.set('type', 'rss')
                feed_outline.set('text', feed['title'])
                feed_outline.set('title', feed['title'])
                feed_outline.set('xmlUrl', feed['url'])
                feed_outline.set('htmlUrl', feed['html_url'])
        else:
            # Mark category for removal
            categories_to_remove.append(category_outline)
    
    # Remove empty categories
    for category_outline in categories_to_remove:
        parent = category_outline.getparent() if hasattr(category_outline, 'getparent') else None
        if parent is None:
            # Find parent manually
            for elem in root.iter():
                if category_outline in elem:
                    elem.remove(category_outline)
                    break
    
    # Update title
    head = root.find('.//head/title')
    if head is not None:
        head.text = f"Keith subscriptions (cleaned {datetime.now().strftime('%Y-%m-%d')})"
    
    # Write clean OPML
    tree.write(output_file, encoding='UTF-8', xml_declaration=True)
    print(f"Clean OPML written to: {output_file}")

def create_removed_feeds_report(broken_feeds, output_file):
    """Create a text report of removed feeds with reasons"""
    
    with open(output_file, 'w') as f:
        f.write("RSS Feed Audit - Removed Feeds Report\n")
        f.write("=" * 50 + "\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total removed feeds: {len(broken_feeds)}\n\n")
        
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
            if 'HTTP' in error_type:
                error_key = f"HTTP {feed['response_code']}"
            elif 'Invalid XML' in error_type:
                error_key = "Invalid XML"
            elif 'Valid XML but no RSS/Atom elements' in error_type:
                error_key = "No RSS/Atom elements"
            elif 'Timeout' in error_type:
                error_key = "Timeout"
            elif 'Connection error' in error_type:
                error_key = "Connection error"
            elif 'Empty response' in error_type:
                error_key = "Empty response"
            else:
                error_key = "Other"
            
            error_counts[error_key] = error_counts.get(error_key, 0) + 1
        
        for error_type, count in sorted(error_counts.items()):
            f.write(f"{error_type}: {count} feeds\n")
    
    print(f"Removed feeds report written to: {output_file}")

def main():
    # Load audit results
    with open('/Users/kstenson/src/rss-reader/audit_results.json', 'r') as f:
        results = json.load(f)
    
    working_feeds = results['working_feeds']
    broken_feeds = results['broken_feeds']
    
    print(f"Processing {len(working_feeds)} working feeds and {len(broken_feeds)} broken feeds")
    
    # Create clean OPML
    create_clean_opml(
        working_feeds,
        '/Users/kstenson/src/rss-reader/feeds.opml',
        '/Users/kstenson/src/rss-reader/feeds_clean.opml'
    )
    
    # Create removed feeds report
    create_removed_feeds_report(
        broken_feeds,
        '/Users/kstenson/src/rss-reader/removed_feeds_report.txt'
    )
    
    print("\nFiles created successfully!")

if __name__ == "__main__":
    main()