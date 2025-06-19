import csv
import requests
import re
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# UK postcode regex
POSTCODE_REGEX = r'\b[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}\b'

PRIORITY_KEYWORDS = ['contact', 'find-us', 'location', 'visit', 'where', 'about', 'directions']

def postcode_to_latlng(postcode):
    """Convert a UK postcode to latitude and longitude using postcodes.io"""
    url = f"https://api.postcodes.io/postcodes/{postcode.replace(' ', '')}"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        result = response.json()
        if result['status'] == 200:
            return {
                'postcode': result['result']['postcode'],
                'latitude': result['result']['latitude'],
                'longitude': result['result']['longitude']
            }
        else:
            return {'latitude': None, 'longitude': None}
    except Exception as e:
        return {'latitude': None, 'longitude': None}
    
def get_description(soup):
    """Try to extract a description from meta tags or the first paragraph."""
    desc = soup.find("meta", attrs={"name": "description"})
    if desc and desc.get("content"):
        return desc["content"].strip()

    # Fallback: first non-empty paragraph
    for p in soup.find_all("p"):
        text = p.get_text(strip=True)
        if text:
            return text

    # Fallback: title
    title = soup.find("title")
    return title.get_text(strip=True) if title else None

def find_postcode(text):
    """Search for a UK postcode in text."""
    match = re.search(POSTCODE_REGEX, text, re.I)
    return match.group(0) if match else None

def is_priority_url(url):
    return any(keyword in url.lower() for keyword in PRIORITY_KEYWORDS)

def scrape_website(base_url, max_pages=50):
    if (base_url == '') or (base_url is None): return {'description': '', 'postcode': ''}

    try:
        response = requests.get(base_url, timeout=10)
        response.raise_for_status()
    except Exception as e:
        return {'description': '', 'postcode': ''}

    soup = BeautifulSoup(response.text, 'html.parser')
    description = get_description(soup)

    possible_postcodes = []
    # Try to find postcode in homepage first
    postcode = find_postcode(soup.get_text())
    possible_postcodes.append(postcode)

    # If not found, crawl a few internal links
    parsed_base = urlparse(base_url)
    netloc = parsed_base.netloc
    if 'www' in netloc: netloc = netloc.replace('www.', '')
    domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
    links = {urljoin(domain, a.get("href")) for a in soup.find_all("a", href=True)}
    internal_links = [link for link in links if netloc in urlparse(link).netloc]

    # Sort links so priority pages come first
    sorted_links = sorted(internal_links, key=lambda url: 0 if is_priority_url(url) else 1)

    for link in sorted_links[:max_pages]:
        try:
            r = requests.get(link, timeout=5)
            text = r.text
            postcode = find_postcode(text)
            if postcode:
                break
        except Exception:
            continue

    return {
        "description": description,
        "postcode": postcode
    }

def scrape_members():

    members = []

    for page in range(1, 38):
        print("Loading page", page)
        url = "https://communityenergyengland.org/current-members/page:" + str(page)
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Each member block seems to be inside a <div> with a class like "member-item" or similar
        for member in soup.select('.listing--member'):  # Adjust selector if needed
            name = member.find('h2')
            name = name.get_text(strip=True) if name else None

            test = member.find('a')
            website_link = member.find('a')
            website = website_link['href'] if website_link else None

            logo_img = member.find('img')
            logo = 'https://communityenergyengland.org' + logo_img['src'] if logo_img else None

            member_data = scrape_website(website)
            lnglat = {'longitude': None, 'latitude': None}
            if member_data['postcode'] is not None:
                lnglat = postcode_to_latlng(member_data['postcode'])
            output_data = {
                'Organisation Name': name,
                'Website URL': website,
                'Logo URL': logo,
                'Short Description': member_data['description'],
                'Address': '',
                'Postcode': member_data['postcode'],
                'Latitude': lnglat['latitude'],
                'Longitude': lnglat['longitude']
            }
            output_data['Longitude'] = lnglat['longitude']

            print(json.dumps(output_data, indent=4))
            members.append(output_data)

    return members

if __name__ == "__main__":
    members = scrape_members()

    with open('england.csv', 'w', newline='') as csvfile:
        fieldnames = members[0].keys()
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for member in members:
            writer.writerow(member)


