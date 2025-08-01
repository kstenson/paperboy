#!/usr/bin/env python3
"""
Re-test feeds that were marked as "Valid XML but no RSS/Atom elements found"
with improved Atom feed detection
"""

import json
import requests
import xml.etree.ElementTree as ET

def improved_rss_atom_check(content):
    """Improved check for RSS/Atom feeds"""
    try:
        root = ET.fromstring(content)
        
        # Check root element
        if root.tag in ['rss', 'feed']:
            return True
            
        # Check for RSS elements
        if (root.find('.//item') is not None or 
            root.find('.//channel') is not None):
            return True
            
        # Check for Atom elements (with namespaces)
        if (root.find('.//entry') is not None or
            root.tag.endswith('}feed') or  # namespaced feed element
            any(child.tag.endswith('}entry') for child in root.iter())):  # namespaced entry
            return True
            
        # Check if root tag contains 'feed' (for namespaced feeds)
        if 'feed' in root.tag.lower():
            return True
            
        return False
        
    except ET.ParseError:
        return False

def retest_suspicious_feeds():
    """Re-test feeds that might be valid Atom feeds"""
    
    # Load original results
    with open('/Users/kstenson/src/rss-reader/audit_results.json', 'r') as f:
        results = json.load(f)
    
    # Find feeds marked as "Valid XML but no RSS/Atom elements found"
    suspicious_feeds = [
        feed for feed in results['broken_feeds'] 
        if feed['error'] == "Valid XML but no RSS/Atom elements found"
    ]
    
    print(f"Re-testing {len(suspicious_feeds)} suspicious feeds...")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    
    recovered_feeds = []
    still_broken = []
    
    for feed in suspicious_feeds:
        print(f"\nRe-testing: {feed['title']} ({feed['url']})")
        
        try:
            response = session.get(feed['url'], timeout=30)
            if response.status_code == 200:
                content = response.text
                if improved_rss_atom_check(content):
                    print("✓ RECOVERED - This is a valid feed!")
                    feed['status'] = 'working'
                    feed['error'] = None
                    feed['has_rss_elements'] = True
                    recovered_feeds.append(feed)
                else:
                    print("✗ Still broken - No RSS/Atom elements found")
                    still_broken.append(feed)
            else:
                print(f"✗ Still broken - HTTP {response.status_code}")
                still_broken.append(feed)
                
        except Exception as e:
            print(f"✗ Still broken - {str(e)}")
            still_broken.append(feed)
    
    print(f"\n=== RESULTS ===")
    print(f"Recovered feeds: {len(recovered_feeds)}")
    print(f"Still broken: {len(still_broken)}")
    
    if recovered_feeds:
        print("\nRecovered feeds:")
        for feed in recovered_feeds:
            print(f"  - {feed['title']}")
    
    return recovered_feeds, still_broken

def update_results(recovered_feeds, still_broken):
    """Update the results files with recovered feeds"""
    
    # Load original results
    with open('/Users/kstenson/src/rss-reader/audit_results.json', 'r') as f:
        results = json.load(f)
    
    # Remove recovered feeds from broken list
    original_broken = results['broken_feeds']
    updated_broken = []
    
    recovered_urls = {feed['url'] for feed in recovered_feeds}
    
    for feed in original_broken:
        if feed['url'] not in recovered_urls:
            updated_broken.append(feed)
    
    # Add recovered feeds to working list
    results['working_feeds'].extend(recovered_feeds)
    results['broken_feeds'] = updated_broken
    results['working_count'] = len(results['working_feeds'])
    results['broken_count'] = len(results['broken_feeds'])
    
    # Save updated results
    with open('/Users/kstenson/src/rss-reader/audit_results_updated.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nUpdated results saved to: /Users/kstenson/src/rss-reader/audit_results_updated.json")
    print(f"Final counts: {results['working_count']} working, {results['broken_count']} broken")
    
    return results

def main():
    recovered_feeds, still_broken = retest_suspicious_feeds()
    if recovered_feeds:
        updated_results = update_results(recovered_feeds, still_broken)
        return updated_results
    else:
        print("No feeds were recovered.")
        return None

if __name__ == "__main__":
    main()