import os
import time
import urllib.request
import xml.etree.ElementTree as ET
import html.parser
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache configuration
CACHE_DURATION = 600  # 10 minutes cache
cache = {
    "data": None,
    "last_updated": 0
}

class BQReleaseNotesParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.updates = []
        self.current_type = "Update"
        self.current_html_parts = []
        self.current_text_parts = []
        self.in_h3 = False
        
    def handle_starttag(self, tag, attrs):
        if tag == 'h3':
            self.save_current_update()
            self.in_h3 = True
            self.current_html_parts = []
            self.current_text_parts = []
        else:
            attr_str = "".join(f' {k}="{v}"' for k, v in attrs)
            self.current_html_parts.append(f"<{tag}{attr_str}>")
            
    def handle_endtag(self, tag):
        if tag == 'h3':
            self.in_h3 = False
        else:
            self.current_html_parts.append(f"</{tag}>")
            
    def handle_data(self, data):
        if self.in_h3:
            self.current_type = data.strip()
        else:
            self.current_html_parts.append(data)
            self.current_text_parts.append(data)
            
    def save_current_update(self):
        desc_html = "".join(self.current_html_parts).strip()
        desc_text = "".join(self.current_text_parts).strip()
        # Clean double spaces/newlines
        desc_text = " ".join(desc_text.split())
        if desc_html or desc_text:
            self.updates.append({
                "type": self.current_type or "Update",
                "description_html": desc_html,
                "description_text": desc_text
            })
            
    def close(self):
        self.save_current_update()
        super().close()

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    all_updates = []
    
    # Each entry in Atom represents updates for a single date
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        date_str = title.text if title is not None else "Unknown Date"
        
        updated_el = entry.find('atom:updated', ns)
        updated_str = updated_el.text if updated_el is not None else ""
        
        content_el = entry.find('atom:content', ns)
        if content_el is not None and content_el.text:
            parser = BQReleaseNotesParser()
            parser.feed(content_el.text)
            parser.close()
            
            # For each sub-update parsed from the entry, format it
            for idx, update in enumerate(parser.updates):
                # We can generate a unique ID for each update using the entry id + index
                entry_id_el = entry.find('atom:id', ns)
                entry_id = entry_id_el.text if entry_id_el is not None else str(hash(date_str))
                update_id = f"{entry_id}_{idx}"
                
                all_updates.append({
                    "id": update_id,
                    "date": date_str,
                    "raw_date": updated_str,
                    "type": update["type"],
                    "description_html": update["description_html"],
                    "description_text": update["description_text"]
                })
                
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or cache["data"] is None or (current_time - cache["last_updated"]) > CACHE_DURATION:
        try:
            updates = fetch_and_parse_feed()
            cache["data"] = updates
            cache["last_updated"] = current_time
            return jsonify({
                "success": True,
                "source": "live",
                "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(current_time)),
                "updates": updates
            })
        except Exception as e:
            # If fetch fails and we have cached data, return the cache as fallback
            if cache["data"] is not None:
                return jsonify({
                    "success": False,
                    "error": f"Failed to fetch live feed: {str(e)}. Displaying cached data.",
                    "source": "cache_fallback",
                    "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_updated"])),
                    "updates": cache["data"]
                })
            return jsonify({
                "success": False,
                "error": str(e),
                "updates": []
            }), 500
            
    return jsonify({
        "success": True,
        "source": "cache",
        "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_updated"])),
        "updates": cache["data"]
    })

if __name__ == '__main__':
    # Running on port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
