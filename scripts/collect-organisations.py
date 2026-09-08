"""Collect short, attributed public-site excerpts; never bypass blocked websites."""
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import re
import ssl
import sys
import urllib.request
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / 'data' / 'evaluation'
DEST.mkdir(parents=True, exist_ok=True)

# Discovery candidates, not a statement of registration or current legal ownership.
# Only successful pages with matching brand text and a usable excerpt enter the corpus.
CANDIDATES = '''Zerodha|zerodha.com|securities
Groww|groww.in|securities
Upstox|upstox.com|securities
Angel One|angelone.in|securities
ICICI Direct|icicidirect.com|securities
HDFC Securities|hdfcsec.com|securities
Kotak Securities|kotaksecurities.com|securities
Motilal Oswal|motilaloswal.com|securities
Sharekhan|sharekhan.com|securities
5paisa|5paisa.com|securities
FYERS|fyers.in|securities
Dhan|dhan.co|securities
Alice Blue|aliceblueonline.com|securities
Samco|samco.in|securities
Choice|choiceindia.com|securities
Geojit|geojit.com|securities
IIFL Capital|iiflcapital.com|securities
SMC|smctradeonline.com|securities
Nuvama|nuvamawealth.com|securities
Axis Direct|simplehai.axisdirect.in|securities
Prabhudas Lilladher|plindia.com|securities
Anand Rathi|rathi.com|securities
Religare Broking|religareonline.com|securities
StoxBox|stoxbox.in|securities
TradeSmart|tradesmartonline.in|securities
Razorpay|razorpay.com|general-fintech
Cashfree|cashfree.com|general-fintech
PhonePe|phonepe.com|general-fintech
Paytm|paytm.com|general-fintech
PayU|payu.in|general-fintech
CCAvenue|ccavenue.com|general-fintech
BillDesk|billdesk.com|general-fintech
Instamojo|instamojo.com|general-fintech
Juspay|juspay.in|general-fintech
Pine Labs|pinelabs.com|general-fintech
BharatPe|bharatpe.com|general-fintech
MobiKwik|mobikwik.com|general-fintech
Freecharge|freecharge.in|general-fintech
Mswipe|mswipe.com|general-fintech
Easebuzz|easebuzz.in|general-fintech
PayGlocal|payglocal.in|general-fintech
Decentro|decentro.tech|general-fintech
Open|open.money|general-fintech
Niyo|goniyo.com|general-fintech
Jupiter|jupiter.money|general-fintech
Fi|fi.money|general-fintech
CRED|cred.club|general-fintech
Freo|freo.money|digital-lending
slice|sliceit.com|general-fintech
OneCard|getonecard.app|general-fintech
Navi|navi.com|digital-lending
Moneyview|moneyview.in|digital-lending
KreditBee|kreditbee.in|digital-lending
CASHe|cashe.co.in|digital-lending
Fibe|fibe.in|digital-lending
Kissht|kissht.com|digital-lending
Kreditzy|kreditzy.com|digital-lending
Lendingkart|lendingkart.com|digital-lending
FlexiLoans|flexiloans.com|digital-lending
Indifi|indifi.com|digital-lending
InCred|incred.com|digital-lending
Clix Capital|clix.capital|digital-lending
IIFL Finance|iifl.com|digital-lending
Bajaj Finserv|bajajfinserv.in|digital-lending
Tata Capital|tatacapital.com|digital-lending
Aditya Birla Capital|adityabirlacapital.com|digital-lending
L&T Finance|ltfinance.com|digital-lending
Mahindra Finance|mahindrafinance.com|digital-lending
Shriram Finance|shriramfinance.in|digital-lending
Muthoot Finance|muthootfinance.com|digital-lending
Manappuram|manappuram.com|digital-lending
Poonawalla Fincorp|poonawallafincorp.com|digital-lending
Hero FinCorp|herofincorp.com|digital-lending
CreditAccess Grameen|creditaccessgrameen.in|digital-lending
Aavas|aavas.in|digital-lending
Aptus|aptusindia.com|digital-lending
Home First|homefirstindia.com|digital-lending
India Shelter|indiashelter.in|digital-lending
PNB Housing|pnbhousing.com|digital-lending
LIC Housing|lichousing.com|digital-lending
HDFC Bank|hdfcbank.com|general-fintech
ICICI Bank|icicibank.com|general-fintech
Axis Bank|axisbank.com|general-fintech
Kotak Mahindra Bank|kotak.com|general-fintech
State Bank of India|sbi.co.in|general-fintech
Bank of Baroda|bankofbaroda.in|general-fintech
Punjab National Bank|pnbindia.in|general-fintech
Canara Bank|canarabank.com|general-fintech
Union Bank|unionbankofindia.co.in|general-fintech
Bank of India|bankofindia.co.in|general-fintech
Indian Bank|indianbank.in|general-fintech
Bank of Maharashtra|bankofmaharashtra.in|general-fintech
UCO Bank|ucobank.com|general-fintech
Indian Overseas Bank|iob.in|general-fintech
Central Bank of India|centralbankofindia.co.in|general-fintech
IDFC FIRST Bank|idfcfirstbank.com|general-fintech
IndusInd Bank|indusind.com|general-fintech
Federal Bank|federalbank.co.in|general-fintech
Yes Bank|yesbank.in|general-fintech
RBL Bank|rblbank.com|general-fintech
Bandhan Bank|bandhanbank.com|general-fintech
South Indian Bank|southindianbank.com|general-fintech
Karur Vysya Bank|kvb.co.in|general-fintech
City Union Bank|cityunionbank.com|general-fintech
Karnataka Bank|karnatakabank.com|general-fintech
DCB Bank|dcbbank.com|general-fintech
Tamilnad Mercantile Bank|tmb.in|general-fintech
AU Small Finance Bank|aubank.in|general-fintech
Ujjivan|ujjivansfb.in|general-fintech
Equitas|equitasbank.com|general-fintech
Jana Small Finance Bank|janabank.com|general-fintech
Suryoday|suryodaybank.com|general-fintech
Utkarsh|utkarsh.bank|general-fintech
ESAF|esafbank.com|general-fintech
Fino|finobank.com|general-fintech
Airtel Payments Bank|airtel.in/bank|general-fintech
Policybazaar|policybazaar.com|general-fintech
ACKO|acko.com|general-fintech
Digit|godigit.com|general-fintech
HDFC ERGO|hdfcergo.com|general-fintech
ICICI Lombard|icicilombard.com|general-fintech
Tata AIG|tataaig.com|general-fintech
Bajaj Allianz|bajajallianz.com|general-fintech
SBI General|sbigeneral.in|general-fintech
Star Health|starhealth.in|general-fintech
Care Health|careinsurance.com|general-fintech
Niva Bupa|nivabupa.com|general-fintech
HDFC Life|hdfclife.com|general-fintech
ICICI Prudential Life|iciciprulife.com|general-fintech
SBI Life|sbilife.co.in|general-fintech
Axis Max Life|maxlifeinsurance.com|general-fintech
Tata AIA|tataaia.com|general-fintech
PNB MetLife|pnbmetlife.com|general-fintech
Canara HSBC Life|canarahsbclife.com|general-fintech
Edelweiss Life|edelweisslife.in|general-fintech
SBI Mutual Fund|sbimf.com|investment-advice
HDFC Mutual Fund|hdfcfund.com|investment-advice
ICICI Prudential Mutual Fund|icicipruamc.com|investment-advice
Nippon India Mutual Fund|mf.nipponindiaim.com|investment-advice
Aditya Birla Sun Life Mutual Fund|mutualfund.adityabirlacapital.com|investment-advice
Axis Mutual Fund|axismf.com|investment-advice
Kotak Mutual Fund|kotakmf.com|investment-advice
UTI Mutual Fund|utimf.com|investment-advice
DSP Mutual Fund|dspim.com|investment-advice
Mirae Asset|miraeassetmf.co.in|investment-advice
Franklin Templeton|franklintempletonindia.com|investment-advice
Tata Mutual Fund|tatamutualfund.com|investment-advice
Bandhan Mutual Fund|bandhanmutual.com|investment-advice
Edelweiss Mutual Fund|edelweissmf.com|investment-advice
PGIM India|pgimindiamf.com|investment-advice
Quantum Mutual Fund|quantumamc.com|investment-advice
Quant Mutual Fund|quantmutual.com|investment-advice
PPFAS|amc.ppfas.com|investment-advice
360 ONE|360.one|investment-advice
Dezerv|dezerv.in|investment-advice
Scripbox|scripbox.com|investment-advice
Kuvera|kuvera.in|investment-advice
smallcase|smallcase.com|investment-advice
INDmoney|indmoney.com|securities
ET Money|etmoney.com|investment-advice
Fisdom|fisdom.com|investment-advice
Stable Money|stablemoney.in|general-fintech
Grip Invest|gripinvest.in|securities
Wint Wealth|wintwealth.com|securities
GoldenPi|goldenpi.com|securities
Jiraaf|jiraaf.com|investment-advice
Vested|vestedfinance.com|securities
Stockal|stockal.com|securities
Clear|cleartax.in|general-fintech
Perfios|perfios.com|general-fintech
Signzy|signzy.com|general-fintech
HyperVerge|hyperverge.co|general-fintech
IDfy|idfy.com|general-fintech
Karza|karza.in|general-fintech
FinBox|finbox.in|general-fintech
Setu|setu.co|general-fintech
Finvu|finvu.in|general-fintech
OneMoney|onemoney.in|general-fintech
Anumati|anumati.co.in|general-fintech
Sahamati|sahamati.org.in|general-fintech
Yubi|go-yubi.com|general-fintech
CredAble|credable.in|digital-lending
Mintifi|mintifi.com|digital-lending
Vayana|vayana.com|general-fintech
Veefin|veefin.com|general-fintech
Zaggle|zaggle.in|general-fintech
EnKash|enkash.com|general-fintech
M2P Fintech|m2pfintech.com|general-fintech
Zeta|zeta.tech|general-fintech
Nucleus Software|nucleussoftware.com|general-fintech
Intellect Design|intellectdesign.com|general-fintech
Newgen|newgensoft.com|general-fintech
Aurionpro|aurionpro.com|general-fintech
Subex|subex.com|general-fintech
Lentra|lentra.ai|general-fintech
Arya.ai|arya.ai|general-fintech
Bureau|bureau.id|general-fintech
Securonix|securonix.com|general-fintech
Data Sutram|datasutram.com|general-fintech
Trustt|trustt.com|general-fintech
Kaleidofin|kaleidofin.com|general-fintech'''

class Extractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.active = []
        self.blocks = []
        self.title = ''
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style', 'noscript', 'svg', 'nav', 'footer', 'header'):
            self.skip += 1
        if not self.skip and tag in ('p', 'h1', 'h2', 'h3', 'title'):
            self.active.append([tag, []])
        if tag == 'meta' and a.get('name', a.get('property', '')).lower() in ('description', 'og:description'):
            self.blocks.append(('meta', a.get('content', '')))
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'svg', 'nav', 'footer', 'header'):
            self.skip = max(0, self.skip - 1)
        if not self.skip:
            for index in range(len(self.active) - 1, -1, -1):
                if self.active[index][0] == tag:
                    _, data = self.active.pop(index)
                    value = re.sub(r'\s+', ' ', ''.join(data)).strip()
                    if tag == 'title': self.title = value
                    elif value: self.blocks.append((tag, value))
                    break
    def handle_data(self, data):
        if not self.skip:
            for _, pieces in self.active: pieces.append(data)

KEYWORDS = re.compile(r'\b(guarantee\w*|risk.free|assured|return\w*|AI|artificial intelligence|instant|best|first|largest|leading|lowest|free|zero|trusted|secure|registered|regulated|lending|loan\w*|banking|payment\w*|invest\w*|insurance|credit|finance)\b', re.I)
NOISE = re.compile(r'(enable javascript|access denied|captcha|page not found|cookie|all rights reserved|privacy policy|subscribe to|terms and conditions|browser is not supported)', re.I)

def collect(index, line):
    name, domain, context = line.split('|')
    url = 'https://' + domain + '/'
    base = dict(index=index, company=name, requestedUrl=url, marketContext=context)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; ClaimCheckResearch/0.3; public-page-review)', 'Accept': 'text/html'})
        tls = ssl.create_default_context(cafile='/etc/ssl/cert.pem') if pathlib.Path('/etc/ssl/cert.pem').exists() else ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=14, context=tls) as response:
            if 'html' not in response.headers.get('content-type', '').lower():
                raise ValueError('Response is not HTML')
            raw = response.read(3_000_000)
            final = response.url
            charset = response.headers.get_content_charset() or 'utf-8'
        parser = Extractor()
        parser.feed(raw.decode(charset, errors='replace'))
        if NOISE.search(parser.title): raise ValueError('Blocked or unavailable page')
        all_text = (parser.title + ' ' + ' '.join(v for _, v in parser.blocks)).lower()
        brand_tokens = [w for w in re.findall(r'[a-z0-9]+', name.lower()) if len(w) > 2 and w not in ('bank', 'finance', 'capital', 'india', 'mutual', 'fund', 'life', 'general', 'money', 'small', 'one')]
        if brand_tokens and not any(t in all_text for t in brand_tokens):
            raise ValueError('Brand identity could not be matched in retrieved text')
        choices = []
        for tag, text in parser.blocks:
            if NOISE.search(text): continue
            # Preserve an exact, contiguous passage; at most 25 quoted words/site.
            for sentence in re.split(r'(?<=[.!?])\s+(?=[A-Z])', text):
                if not 6 <= len(sentence.split()) <= 55: continue
                excerpt = ' '.join(sentence.split()[:25])
                if not KEYWORDS.search(excerpt): continue
                score = len(set(x.lower() for x in KEYWORDS.findall(excerpt))) + (2 if tag in ('h1', 'h2', 'meta') else 0)
                choices.append((score, tag, excerpt, len(sentence.split()) > 25))
        if not choices: raise ValueError('No usable financial claim excerpt')
        _, tag, excerpt, truncated = max(choices, key=lambda c: c[0])
        return dict(base, status='collected', sourceUrl=final, title=parser.title,
                    retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    pageSha256=hashlib.sha256(raw).hexdigest(), extractionTag=tag,
                    excerpt=excerpt, excerptTruncated=truncated,
                    sourceRole='claim-source', independentlyVerified=False)
    except Exception as error:
        return dict(base, status='unavailable', error=str(error)[:180])

if __name__ == '__main__':
    entries = [line for line in CANDIDATES.splitlines() if line.strip()]
    results = json.loads((DEST / 'collection-log.json').read_text()) if '--reuse' in sys.argv else []
    with concurrent.futures.ThreadPoolExecutor(max_workers=18) as pool:
        jobs = [] if results else [pool.submit(collect, i, line) for i, line in enumerate(entries)]
        for job in concurrent.futures.as_completed(jobs):
            result = job.result()
            results.append(result)
            print(json.dumps({k: result[k] for k in ('company', 'status')}, ensure_ascii=False), flush=True)
    results.sort(key=lambda r: r['index'])
    usable = [r for r in results if r['status'] == 'collected']
    # Spread selection across each group to cover banks, insurance and AI vendors.
    groups = {key: [r for r in usable if r['marketContext'] == key] for key in ('securities', 'digital-lending', 'general-fintech', 'investment-advice')}
    selected = []
    for key, quota in {'securities': 20, 'digital-lending': 25, 'general-fintech': 40, 'investment-advice': 15}.items():
        group = groups[key]
        count = min(quota, len(group))
        selected.extend(group[round(i * (len(group) - 1) / max(1, count - 1))] for i in range(count))
    for item in usable:
        if len(selected) >= 100: break
        if item not in selected: selected.append(item)
    selected.sort(key=lambda r: r['index'])
    (DEST / 'collection-log.json').write_text(json.dumps(results, indent=2, ensure_ascii=False))
    (DEST / 'organisations-100.json').write_text(json.dumps(selected, indent=2, ensure_ascii=False))
    print(json.dumps({'attempted': len(results), 'usable': len(usable), 'selected': len(selected)}), flush=True)
