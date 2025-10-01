# Login Problemen Oplossen

## Veelvoorkomende Login Problemen

Kan je niet inloggen bij AvPlanner? Deze gids helpt je de meeste login problemen snel op te lossen.

## Snelle Diagnose

### 🔍 Identificeer je Probleem

**Selecteer wat je ziet:**
- 🚫 ["Incorrect email or password"](#incorrect-email-or-password)
- ⏳ [Pagina blijft laden](#pagina-blijft-laden) 
- 🔄 [Login loop (steeds terug naar login)](#login-loop)
- 📧 ["Email not verified"](#email-not-verified)
- 🔒 ["Account locked"](#account-locked)
- 🌐 [Google login werkt niet](#google-login-problemen)
- ❓ [Anders/onbekend](#andere-problemen)

## Incorrect Email or Password

### 📧 Email Adres Problemen

#### Veelgemaakte Fouten
- **Typo's** - Extra letters, ontbrekende karakters
- **Verkeerde email** - Ander email adres gebruikt bij registratie
- **Spaties** - Onzichtbare spaties voor/na email
- **Autocorrect** - Phone/tablet wijzigt email automatisch

#### Oplossingen
1. **Type email langzaam** - Let op elke letter
2. **Copy-paste email** - Uit registratie email indien beschikbaar
3. **Check multiple accounts** - Gmail, werk email, etc.
4. **Remove spaces** - Selecteer all en type opnieuw

### 🔑 Wachtwoord Problemen

#### Veelgemaakte Fouten
- **Caps Lock aan** - Hoofdletters in plaats van kleine letters
- **Verkeerd wachtwoord** - Ander wachtwoord dan gedacht
- **Autocomplete** - Browser vult verkeerd wachtwoord in
- **Keyboard layout** - Andere toetsenbord indeling

#### Oplossingen
1. **Check Caps Lock** - Indicator op toetsenbord
2. **Type manually** - Geen autocomplete gebruiken
3. **Show password** - Gebruik 👁️ knop om wachtwoord te zien
4. **Try variations** - Verschillende hoofdletter combinaties

### 🔄 Wachtwoord Reset Proces

#### Stap-voor-Stap Reset
1. **Ga naar login pagina**
2. **Klik "Forgot Password?"**
3. **Voer email adres in** (exact zoals geregistreerd)
4. **Klik "Send Reset Link"**
5. **Check email inbox** (en spam folder)
6. **Klik reset link** (geldig 15 minuten)
7. **Voer nieuw wachtwoord in** (2x ter bevestiging)
8. **"Update Password"**

#### Reset Email Problemen
**Email niet ontvangen na 5 minuten?**

1. **Check spam/junk folder** - Auto-filters kunnen email blokkeren
2. **Check email spelling** - Type email opnieuw, precies
3. **Wait longer** - Soms vertraging tot 15 minuten
4. **Try resend** - Klik opnieuw "Send Reset Link"
5. **Different email** - Probeer ander email adres

## Pagina Blijft Laden

### 🌐 Network Connectivity

#### Internet Verbinding Testen
1. **Test andere websites** - Google.com, etc.
2. **Speed test** - Check download/upload speed
3. **WiFi vs Mobile** - Switch tussen verbindingen
4. **Router restart** - Unplug 30 seconden, plug in

#### DNS Problemen
**Symptoms:** Sommige sites werken, andere niet

**Oplossingen:**
1. **Flush DNS cache:**
   - Windows: `ipconfig /flushdns` in Command Prompt
   - Mac: `sudo dscacheutil -flushcache`
   - Linux: `sudo systemctl restart systemd-resolved`

2. **Change DNS servers:**
   - Google DNS: 8.8.8.8, 8.8.4.4
   - Cloudflare: 1.1.1.1, 1.0.0.1

### 🖥️ Browser Problemen

#### Browser Cache Issues
**Symptoms:** Oude versie van site, half geladen pagina's

**Oplossingen:**
1. **Hard refresh:**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Clear browser cache:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Options → Privacy → Clear Data
   - Safari: Develop → Empty Caches

3. **Incognito/Private mode:**
   - Test login in private browsing
   - Eliminates cache/extension issues

#### JavaScript Disabled
**AvPlanner vereist JavaScript voor functionaliteit**

**Enable JavaScript:**
- **Chrome:** Settings → Privacy and security → Site Settings → JavaScript → Allowed
- **Firefox:** about:config → javascript.enabled → true
- **Safari:** Preferences → Security → Enable JavaScript

### 🔌 Browser Extensions

#### Problematische Extensions
- **Ad blockers** - Kunnen login forms blokkeren
- **Privacy extensions** - Strict privacy settings
- **VPN extensions** - IP blocking issues
- **Script blockers** - NoScript, uBlock Origin

#### Troubleshooting Extensions
1. **Disable all extensions** - Test login
2. **Enable one-by-one** - Find problematic extension
3. **Whitelist AvPlanner** - Add to exception list
4. **Alternative browser** - Test without extensions

## Login Loop

### 🔄 Infinite Redirect Issues

#### Symptoms
- Login form accepts credentials
- Redirects back to login page
- No error message shown
- Cycle repeats indefinitely

#### Cookie Problems
**Most common cause of login loops**

1. **Enable cookies:**
   - Chrome: Settings → Privacy → Cookies and site data → Allow all
   - Firefox: Settings → Privacy → Accept cookies from sites
   - Safari: Preferences → Privacy → Cookies: Allow from websites I visit

2. **Clear cookies for AvPlanner:**
   - Chrome: Settings → Privacy → Cookies → See all cookies → Search "avplanner"
   - Firefox: Settings → Privacy → Manage Data → Search "avplanner"

3. **Disable cookie blockers:**
   - Temporarily disable privacy extensions
   - Check antivirus cookie protection

#### Session Storage Issues
1. **Clear session storage:**
   - F12 → Application tab → Storage → Session Storage → Clear
2. **Enable session storage:**
   - Some privacy tools block session storage

### 🕐 Time/Date Problems

#### Incorrect System Time
**Login tokens are time-sensitive**

1. **Check system clock:**
   - Must be accurate within 5 minutes
   - Automatic time sync recommended

2. **Timezone issues:**
   - Ensure correct timezone set
   - Daylight saving time adjustments

## Email Not Verified

### 📧 Email Verification Required

#### Account Activation
**New accounts require email verification**

1. **Check inbox** - Verification email from AvPlanner
2. **Check spam folder** - Auto-filters may catch email
3. **Click verification link** - Must click within 24 hours
4. **Try login again** - After email verified

#### Resend Verification
**If verification email lost:**

1. **Go to login page**
2. **"Resend verification" link** - Usually below login form
3. **Enter email address**
4. **New verification sent**

#### Verification Link Expired
**Links expire after 24 hours**

1. **Request new verification** - Use resend function
2. **Or create new account** - If multiple expired attempts

### 📮 Email Delivery Issues

#### Spam Filter Problems
1. **Check all email folders** - Spam, junk, promotions
2. **Whitelist sender** - Add `noreply@avplanner.com` to contacts
3. **Check email provider** - Some block automated emails

#### Corporate Email Filters
**Company firewalls may block external emails**

1. **Contact IT department** - Request whitelist
2. **Use personal email** - For registration
3. **Alternative verification** - Contact support

## Account Locked

### 🔒 Account Lockout Reasons

#### Too Many Failed Attempts
**Automatic lockout after 5 failed logins**

- **Duration:** 15 minutes
- **Reset:** Wait or successful password reset
- **Prevention:** Use correct credentials

#### Suspicious Activity
**Security system detects unusual behavior**

- **Multiple locations** - Logins from different countries
- **Rapid attempts** - Many failed logins quickly
- **Unusual patterns** - Different than normal usage

#### Manual Suspension
**Account suspended by administrators**

- **Policy violation** - Terms of service breach
- **Reported abuse** - Other users reported issues
- **Security concern** - Compromised account suspected

### 🔓 Account Recovery

#### Automatic Unlock
1. **Wait 15 minutes** - For failed attempt lockouts
2. **Use password reset** - Immediately unlocks account
3. **Contact support** - For persistent issues

#### Manual Review Required
**For security suspensions:**

1. **Email support** - Explain situation
2. **Provide verification** - Prove account ownership
3. **Wait for review** - Usually 1-2 business days
4. **Follow instructions** - Complete any required steps

## Google Login Problemen

### 🔗 OAuth Issues

#### "Authorization Error" 
1. **Clear browser cache** - For Google domains
2. **Disable pop-up blockers** - Allow AvPlanner popups
3. **Enable third-party cookies** - Required for OAuth
4. **Try incognito mode** - Test without cache/extensions

#### "Access Denied"
1. **Check Google account** - Must be accessible
2. **Enable less secure apps** - In Google settings (if required)
3. **2FA issues** - May interfere with OAuth
4. **Use different Google account** - Try alternative account

#### Google Account Issues
**Account suspended or limited:**
1. **Verify Google account status** - Login to Google directly
2. **Complete Google verification** - If account needs verification
3. **Use email/password login** - Alternative method

### 🔄 OAuth Flow Problems

#### Pop-up Blocked
1. **Enable pop-ups** - For avplanner.com domain
2. **Manual pop-up** - Click login again if popup blocked
3. **Redirect method** - Some browsers prefer redirect over popup

#### Cross-Site Issues
1. **Enable cross-site cookies** - Required for OAuth
2. **Whitelist Google domains** - Add *.google.com to exceptions
3. **Check referrer policy** - Strict policies may break OAuth

## Browser Compatibility

### 🌐 Ondersteunde Browsers

#### Aanbevolen Browsers
- **Chrome 90+** - Beste compatibiliteit
- **Firefox 85+** - Volledige ondersteuning
- **Safari 14+** - MacOS/iOS optimized
- **Edge 90+** - Windows integratie

#### Niet Ondersteunde Browsers
- **Internet Explorer** - Niet compatibel
- **Zeer oude browsers** - Security en compatibility issues
- **Enkele mobile browsers** - Beperkte functionaliteit

### ⚠️ Browser-Specifieke Issues

#### Safari Issues
1. **Enable JavaScript** - Required for functionality
2. **Allow cookies** - Cross-site tracking prevention may interfere
3. **Private browsing** - May block some features

#### Firefox Issues
1. **Enhanced Tracking Protection** - May block login components
2. **Strict privacy settings** - Can interfere with authentication
3. **Add-ons** - Privacy add-ons may cause issues

#### Mobile Browser Issues
1. **Desktop mode** - Switch to desktop view
2. **JavaScript enabled** - Must be enabled
3. **Cookies allowed** - Required for sessions

## Andere Problemen

### 🔧 Advanced Troubleshooting

#### Network Diagnostics
1. **Ping test** - `ping avplanner.com`
2. **Traceroute** - Find network bottlenecks
3. **Port testing** - Ensure HTTPS (443) access

#### Developer Tools Debugging
1. **Open DevTools** - F12 in most browsers
2. **Console tab** - Look for JavaScript errors
3. **Network tab** - Check for failed requests
4. **Application tab** - Verify cookies/storage

#### System-Level Issues
1. **Antivirus/Firewall** - May block web connections
2. **Proxy settings** - Corporate proxies may interfere
3. **VPN issues** - Some VPNs block web applications

### 📞 When to Contact Support

#### Contact Support If:
- ✅ Tried all troubleshooting steps
- ✅ Problem persists across browsers/devices
- ✅ Error messages not covered in this guide
- ✅ Account-specific issues (suspended, etc.)

#### Information to Include:
1. **Browser and version** - Chrome 100.0.4896.127
2. **Operating system** - Windows 11, macOS 12.3, etc.
3. **Error messages** - Exact text or screenshot
4. **Steps to reproduce** - What you did when error occurred
5. **Account email** - For account-specific issues

#### Support Channels:
- 📧 **Email:** support@avplanner.com
- 💬 **In-app chat** - Help button in AvPlanner
- 📱 **Community forum** - User-to-user help

### 🛠️ Preventive Measures

#### Avoid Future Login Issues:
1. **Bookmark login page** - Direct access
2. **Save credentials safely** - Use password manager
3. **Keep browser updated** - Latest version for compatibility
4. **Regular cache clearing** - Monthly maintenance
5. **Backup email access** - Ensure email account accessible

#### Security Best Practices:
1. **Strong, unique password** - Don't reuse passwords
2. **Regular password updates** - Change periodically
3. **Secure email account** - Protect email with 2FA
4. **Log out on shared computers** - Always log out
5. **Monitor account activity** - Check for suspicious access

---

**Problem Opgelost?** 🎉
- **Share feedback** - Help us improve this guide
- **Rate this help** - Was this guide useful?

**Nog Steeds Problemen?** 😔
- 📧 **Contact Support** - We helpen je verder
- 💬 **Community Help** - Vraag andere gebruikers
- 📖 **Other Guides** - Check andere troubleshooting docs