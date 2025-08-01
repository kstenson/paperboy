#!/usr/bin/env python3
"""
RSS Feed Auditor - Tests all feeds in an OPML file for accessibility and validity
"""

import xml.etree.ElementTree as ET
import requests
import json
import sys
from urllib.parse import urlparse
from datetime import datetime
import time

class FeedTester:
    def __init__(self, timeout=30):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def test_feed_url(self, url, title):
        """Test a single RSS feed URL"""
        result = {
            'title': title,
            'url': url,
            'status': 'unknown',
            'error': None,
            'response_code': None,
            'content_type': None,
            'is_valid_xml': False,
            'has_rss_elements': False
        }
        
        try:
            print(f"Testing: {title} ({url})")
            
            # Make request with timeout
            response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            result['response_code'] = response.status_code
            result['content_type'] = response.headers.get('content-type', '')
            
            if response.status_code != 200:
                result['status'] = 'failed'
                result['error'] = f"HTTP {response.status_code}"
                return result
            
            # Check if content looks like XML/RSS
            content = response.text
            if not content.strip():
                result['status'] = 'failed'
                result['error'] = "Empty response"
                return result
            
            # Try to parse as XML
            try:
                root = ET.fromstring(content)
                result['is_valid_xml'] = True
                
                # Check for RSS/Atom elements
                if (root.tag in ['rss', 'feed'] or 
                    root.find('.//item') is not None or 
                    root.find('.//entry') is not None or
                    root.find('.//channel') is not None):
                    result['has_rss_elements'] = True
                    result['status'] = 'working'
                else:
                    result['status'] = 'failed'
                    result['error'] = "Valid XML but no RSS/Atom elements found"
                    
            except ET.ParseError as e:
                result['status'] = 'failed'
                result['error'] = f"Invalid XML: {str(e)}"
                
        except requests.exceptions.Timeout:
            result['status'] = 'failed'
            result['error'] = f"Timeout after {self.timeout}s"
        except requests.exceptions.ConnectionError:
            result['status'] = 'failed'
            result['error'] = "Connection error"
        except requests.exceptions.RequestException as e:
            result['status'] = 'failed'
            result['error'] = f"Request error: {str(e)}"
        except Exception as e:
            result['status'] = 'failed'
            result['error'] = f"Unexpected error: {str(e)}"
            
        return result

    def extract_feeds_from_opml(self, opml_file):
        """Extract all RSS feeds from OPML file"""
        feeds = []
        
        try:
            tree = ET.parse(opml_file)
            root = tree.getroot()
            
            # Find all outline elements with xmlUrl
            for outline in root.findall('.//outline[@xmlUrl]'):
                title = outline.get('title', outline.get('text', 'Unknown'))
                xml_url = outline.get('xmlUrl')
                html_url = outline.get('htmlUrl', '')
                category = self._find_category(outline, root)
                
                feeds.append({
                    'title': title,
                    'xml_url': xml_url,
                    'html_url': html_url,
                    'category': category,
                    'element': outline
                })
                
        except ET.ParseError as e:
            print(f"Error parsing OPML file: {e}")
            sys.exit(1)
            
        return feeds

    def _find_category(self, outline_element, root):
        """Find the category/folder for an outline element"""
        parent = outline_element.getparent() if hasattr(outline_element, 'getparent') else None
        
        # Walk up the tree to find parent outline with text attribute
        current = outline_element
        while current is not None:
            parent_outline = None
            for elem in root.iter():
                for child in elem:
                    if child == current:
                        parent_outline = elem
                        break
                if parent_outline is not None:
                    break
            
            if parent_outline is not None and parent_outline.tag == 'outline' and parent_outline.get('text'):
                return parent_outline.get('text')
                
            current = parent_outline
            
        return 'Uncategorized'

    def test_all_feeds(self, opml_file):
        """Test all feeds in OPML file"""
        feeds = self.extract_feeds_from_opml(opml_file)
        print(f"Found {len(feeds)} feeds to test")
        
        working_feeds = []
        broken_feeds = []
        
        for i, feed in enumerate(feeds, 1):
            print(f"\n[{i}/{len(feeds)}] ", end="")
            result = self.test_feed_url(feed['xml_url'], feed['title'])
            
            # Add category and html_url to result
            result['category'] = feed['category']
            result['html_url'] = feed['html_url']
            result['element'] = feed['element']
            
            if result['status'] == 'working':
                working_feeds.append(result)
                print(f"✓ WORKING")
            else:
                broken_feeds.append(result)
                print(f"✗ FAILED: {result['error']}")
                
            # Small delay to be respectful
            time.sleep(0.5)
            
        return working_feeds, broken_feeds

def main():
    opml_file = '/Users/kstenson/src/rss-reader/feeds.opml'
    
    print("RSS Feed Auditor")
    print("=" * 50)
    print(f"Testing feeds from: {opml_file}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    tester = FeedTester(timeout=30)
    working_feeds, broken_feeds = tester.test_all_feeds(opml_file)
    
    print("\n" + "=" * 50)
    print("AUDIT COMPLETE")
    print("=" * 50)
    print(f"Total feeds tested: {len(working_feeds) + len(broken_feeds)}")
    print(f"Working feeds: {len(working_feeds)}")
    print(f"Broken feeds: {len(broken_feeds)}")
    
    # Save results to JSON for processing
    results = {
        'timestamp': datetime.now().isoformat(),
        'total_tested': len(working_feeds) + len(broken_feeds),
        'working_count': len(working_feeds),
        'broken_count': len(broken_feeds),
        'working_feeds': working_feeds,
        'broken_feeds': broken_feeds
    }
    
    with open('/Users/kstenson/src/rss-reader/audit_results.json', 'w') as f:
        # Remove element objects for JSON serialization
        results_clean = results.copy()
        for feed_list in ['working_feeds', 'broken_feeds']:
            for feed in results_clean[feed_list]:
                if 'element' in feed:
                    del feed['element']
        json.dump(results_clean, f, indent=2)
    
    print(f"\nResults saved to: /Users/kstenson/src/rss-reader/audit_results.json")
    
    return working_feeds, broken_feeds

if __name__ == "__main__":
    main()