# DNS Configuration for Email Deliverability - Finhome360

## Overview

To ensure your emails from `noreply@finhome360.com` arrive in users' inboxes (not spam), you need to add DNS records that verify your domain ownership and authorize MailChannels to send emails on your behalf.

## Prerequisites

- Access to your domain's DNS settings (Cloudflare dashboard or domain registrar)
- Domain: `finhome360.com`
- Cloudflare Account ID (we'll find this below)

---

## Step 1: Get Your Cloudflare Account ID

### Method 1: From Workers Dashboard
1. Go to https://dash.cloudflare.com
2. Click on "Workers & Pages" in the left sidebar
3. Click on any worker (e.g., `finhome-api`)
4. Look at the right sidebar - you'll see "Account ID"
5. Click the copy icon to copy it

### Method 2: From URL
1. Go to https://dash.cloudflare.com
2. Your account ID is in the URL after `/accounts/`
   - Example: `https://dash.cloudflare.com/accounts/abc123def456/...`
   - Account ID would be: `abc123def456`

### Method 3: From Wrangler CLI
```bash
wrangler whoami
```
This will display your account details including the Account ID.

**Save this Account ID** - you'll need it for the DNS records below.

---

## Step 2: Access DNS Settings

### If your domain is on Cloudflare:
1. Go to https://dash.cloudflare.com
2. Select your domain: `finhome360.com`
3. Click on "DNS" in the left menu
4. Click "Add record" button

### If your domain is elsewhere (GoDaddy, Namecheap, etc.):
1. Log into your domain registrar
2. Find "DNS Management" or "DNS Settings"
3. Look for option to add DNS records

---

## Step 3: Add DNS Records

You need to add **3 DNS records** for optimal email deliverability:

### Record 1: SPF Record (Sender Policy Framework)

**Purpose**: Tells email providers that MailChannels is authorized to send emails for your domain.

```
Type:    TXT
Name:    @  (or leave blank for root domain)
Content: v=spf1 include:relay.mailchannels.net ~all
TTL:     Auto (or 3600)
```

**In Cloudflare Dashboard:**
- Type: `TXT`
- Name: `@`
- Content: `v=spf1 include:relay.mailchannels.net ~all`
- Proxy status: DNS only (grey cloud)
- TTL: Auto
- Click "Save"

**Important Notes:**
- If you already have an SPF record, **don't create a second one**
- Instead, modify your existing SPF record to include MailChannels:
  - Old: `v=spf1 include:_spf.google.com ~all`
  - New: `v=spf1 include:_spf.google.com include:relay.mailchannels.net ~all`

---

### Record 2: MailChannels Domain Lock

**Purpose**: Verifies that you own this domain and want to use MailChannels.

```
Type:    TXT
Name:    _mailchannels
Content: v=mc1 cfid=YOUR_ACCOUNT_ID_HERE
TTL:     Auto (or 3600)
```

**Replace `YOUR_ACCOUNT_ID_HERE` with your actual Cloudflare Account ID from Step 1.**

**Example:**
If your Account ID is `abc123def456`, the content would be:
```
v=mc1 cfid=abc123def456
```

**In Cloudflare Dashboard:**
- Type: `TXT`
- Name: `_mailchannels`
- Content: `v=mc1 cfid=abc123def456` (use your actual Account ID)
- Proxy status: DNS only (grey cloud)
- TTL: Auto
- Click "Save"

---

### Record 3: DKIM Record (Optional but Recommended)

**Purpose**: Adds a cryptographic signature to your emails for additional verification.

⚠️ **Note**: This requires contacting MailChannels support to generate your DKIM key.

**For now, you can skip this** - the first two records (SPF and Domain Lock) are sufficient for good deliverability.

**If you want to add DKIM later:**
1. Email MailChannels support: support@mailchannels.com
2. Request a DKIM key for `finhome360.com`
3. They'll provide the DNS record to add
4. Typical format:
```
Type:    TXT
Name:    mailchannels._domainkey
Content: v=DKIM1; k=rsa; p=LONG_PUBLIC_KEY_HERE
TTL:     Auto
```

---

## Step 4: Add DMARC Record (Optional but Recommended)

**Purpose**: Tells email providers what to do with emails that fail SPF/DKIM checks.

```
Type:    TXT
Name:    _dmarc
Content: v=DMARC1; p=quarantine; rua=mailto:postmaster@finhome360.com
TTL:     Auto (or 3600)
```

**Explanation:**
- `p=quarantine` - Put suspicious emails in spam (safer than reject)
- `rua=mailto:...` - Where to send DMARC reports
- You can use `p=none` initially to just monitor

**In Cloudflare Dashboard:**
- Type: `TXT`
- Name: `_dmarc`
- Content: `v=DMARC1; p=quarantine; rua=mailto:postmaster@finhome360.com`
- Proxy status: DNS only (grey cloud)
- TTL: Auto
- Click "Save"

---

## Step 5: Verify DNS Records

### Wait for Propagation
DNS changes can take 5-60 minutes to propagate globally. Usually it's instant with Cloudflare.

### Check DNS Records Online
Use these tools to verify your records are set up correctly:

1. **MXToolbox**: https://mxtoolbox.com/SuperTool.aspx
   - Enter: `finhome360.com`
   - Check SPF Record

2. **Google DNS Checker**: https://dns.google
   - Query: `finhome360.com TXT`
   - Should see your SPF record

3. **Command Line** (PowerShell):
```powershell
# Check SPF record
nslookup -type=txt finhome360.com

# Check MailChannels domain lock
nslookup -type=txt _mailchannels.finhome360.com

# Check DMARC record
nslookup -type=txt _dmarc.finhome360.com
```

---

## Step 6: Test Email Delivery

### Send a Test Email

1. **Test Bill Reminder:**
   - Create a bill reminder due in 3 days
   - Wait for queue to process
   - Check your email

2. **Test Member Invitation:**
   - Go to Settings → Family Members
   - Invite yourself (use your email)
   - Check email immediately

### Check Email Headers

When you receive a test email:
1. Open the email
2. View "Show Original" or "View Headers"
3. Look for:
   - `SPF: PASS` ✅
   - `DKIM: PASS` ✅ (if configured)
   - `DMARC: PASS` ✅ (if configured)

### Email Testing Tools

Send a test email to these services:
- **Mail Tester**: mail-tester.com (gives you a score out of 10)
- **GlockApps**: glockapps.com (checks spam folder placement)

---

## Quick Reference: DNS Records Summary

Here's a checklist of all DNS records to add:

### Required Records (Add These):

1. ✅ **SPF Record**
   ```
   TXT @ v=spf1 include:relay.mailchannels.net ~all
   ```

2. ✅ **Domain Lock**
   ```
   TXT _mailchannels v=mc1 cfid=YOUR_ACCOUNT_ID
   ```

### Recommended Records (Optional):

3. ⚪ **DMARC Record**
   ```
   TXT _dmarc v=DMARC1; p=quarantine; rua=mailto:postmaster@finhome360.com
   ```

4. ⚪ **DKIM Record** (requires MailChannels support)
   ```
   TXT mailchannels._domainkey v=DKIM1; k=rsa; p=KEY_FROM_MAILCHANNELS
   ```

---

## Cloudflare-Specific Tips

### Using Cloudflare DNS:

**Advantages:**
- Instant propagation (no waiting)
- Easy to manage
- API access if needed
- Built-in DNS analytics

**Settings:**
- **Proxy Status**: Set to "DNS only" (grey cloud) for TXT records
- **TTL**: Use "Auto" for flexibility
- **Priority**: Not needed for TXT records

### DNS Screenshot (What it should look like):

```
Type  Name              Content                                      Proxy    TTL
TXT   @                 v=spf1 include:relay.mailchannels.net ~all  DNS only Auto
TXT   _mailchannels     v=mc1 cfid=abc123def456                     DNS only Auto
TXT   _dmarc            v=DMARC1; p=quarantine; rua=mailto:...      DNS only Auto
```

---

## Troubleshooting

### Emails still going to spam?

1. **Wait longer** - DNS propagation can take up to 24 hours (though usually faster)

2. **Check records** - Use nslookup or MXToolbox to verify records are live

3. **Check email content** - Make sure emails aren't flagged for other reasons:
   - Not too many links
   - Good text-to-image ratio
   - No spam trigger words

4. **Warm up your domain** - Send to engaged recipients first, gradually increase volume

5. **Check Cloudflare Account ID** - Make sure it's correct in the domain lock record

### Record conflicts?

**Multiple SPF records:**
- You can only have ONE SPF record per domain
- Combine all includes: `v=spf1 include:provider1.com include:provider2.com ~all`

**Other email services:**
- If you use Google Workspace, Office 365, etc., keep their SPF includes
- Example: `v=spf1 include:_spf.google.com include:relay.mailchannels.net ~all`

---

## Expected Results

### Before DNS Configuration:
- Emails send successfully ✅
- Some emails land in spam ⚠️
- Email headers show SPF: NONE or FAIL ❌

### After DNS Configuration:
- Emails send successfully ✅
- Emails arrive in inbox reliably ✅
- Email headers show SPF: PASS ✅
- Professional email reputation ✅

---

## Monitoring Email Deliverability

### Regular Checks:

1. **Monthly**: Test email delivery to different providers
   - Gmail
   - Outlook/Hotmail
   - Yahoo
   - Custom domains

2. **Check Cloudflare Logs**: Monitor for email send failures

3. **DMARC Reports**: If configured, review weekly reports

4. **User Feedback**: Ask users if they're receiving notifications

---

## Next Steps After DNS Setup

Once DNS is configured:

1. ✅ Wait 10-30 minutes for propagation
2. ✅ Verify records using online tools
3. ✅ Send test emails
4. ✅ Check email headers for PASS status
5. ✅ Monitor deliverability for first week
6. 📧 Consider adding DKIM for even better reputation

---

## Support & Resources

### If you need help:

**MailChannels Support:**
- Email: support@mailchannels.com
- Docs: https://mailchannels.zendesk.com/hc/en-us

**Cloudflare Support:**
- Dashboard: https://dash.cloudflare.com
- Docs: https://developers.cloudflare.com/dns/

**DNS Tools:**
- MXToolbox: https://mxtoolbox.com
- Google DNS: https://dns.google
- Mail Tester: https://mail-tester.com

---

## Summary

### Minimum Required (Do This Now):
1. Get your Cloudflare Account ID
2. Add SPF record: `TXT @ v=spf1 include:relay.mailchannels.net ~all`
3. Add Domain Lock: `TXT _mailchannels v=mc1 cfid=YOUR_ACCOUNT_ID`

### Optional but Recommended (Do Later):
4. Add DMARC record
5. Request and add DKIM record from MailChannels

### Time Investment:
- **Setup**: 10-15 minutes
- **Propagation**: 5-60 minutes
- **Testing**: 5 minutes

### Impact:
- 📈 Significantly improved email deliverability
- 📬 Emails arrive in inbox instead of spam
- ✅ Professional email reputation
- 🔒 Better email security

---

**Ready to start?** Follow Steps 1-3 above, then test with Step 6! 🚀
