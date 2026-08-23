import requests
import re
import json

# Get visitor data from YouTube embed page
response = requests.get('https://www.youtube.com/embed/dQw4w9WgXcQ')
text = response.text

# Extract visitor data from the response
match = re.search(r'"visitorData":"([^"]+)"', text)
if match:
    visitor_data = match.group(1)
    print(f'visitorData: {visitor_data}')

    # Now generate PoToken with this visitor data
    from pytubefix.botGuard.bot_guard import generate_po_token
    po_token = generate_po_token('dQw4w9WgXcQ')
    print(f'poToken: {po_token}')
else:
    print('Could not find visitorData in embed page')
    # Try alternative method
    response2 = requests.get('https://www.youtube.com/', headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    match2 = re.search(r'"visitorData":"([^"]+)"', response2.text)
    if match2:
        visitor_data = match2.group(1)
        print(f'visitorData: {visitor_data}')

        from pytubefix.botGuard.bot_guard import generate_po_token
        po_token = generate_po_token('dQw4w9WgXcQ')
        print(f'poToken: {po_token}')
    else:
        print('Could not find visitorData')
