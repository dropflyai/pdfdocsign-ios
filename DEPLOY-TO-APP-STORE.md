# 📱 Deploy PDF Doc Sign to App Store

## ✅ What's Already Done
- ✅ GitHub Actions workflow created
- ✅ Next.js configured for static export
- ✅ Capacitor iOS project set up
- ✅ App configured as "PDF Doc Sign" (com.dropfly.pdfeditor)

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Create GitHub Repository (5 minutes)

1. Go to https://github.com/new
2. Create a new repository (can be private)
3. Initialize it and push your code:

```bash
cd /Users/rioallen/Documents/DropFly-OS-App-Builder/DropFly-PROJECTS/pdf-editor
git init
git add .
git commit -m "Initial commit - PDF Doc Sign"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main
```

---

### Step 2: Apple Developer Account Setup (30 minutes)

#### 2.1 Create App ID
1. Go to https://developer.apple.com/account
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** button
4. Select **App IDs** → **App**
5. Use these details:
   - **Description**: PDF Doc Sign
   - **Bundle ID**: `com.dropfly.pdfeditor`
   - **Capabilities**: (none needed for basic PDF Doc Sign)
6. Click **Continue** → **Register**

#### 2.2 Create Distribution Certificate
1. In **Certificates** section → **+** button
2. Select **iOS Distribution**
3. Create a Certificate Signing Request (CSR):
   - Open **Keychain Access** on Mac
   - Menu: **Keychain Access** → **Certificate Assistant** → **Request a Certificate**
   - Email: your Apple ID email
   - Name: "PDF Doc Sign Distribution"
   - **Save to disk**
4. Upload the CSR file
5. Download the certificate (.cer file)
6. Double-click to add to Keychain

#### 2.3 Export Certificate as P12
1. Open **Keychain Access**
2. Find your certificate (look for "iPhone Distribution")
3. **Right-click** → **Export**
4. Save as `.p12` file
5. **Set a password** (remember this!)

#### 2.4 Create Provisioning Profile
1. Go to **Profiles** → **+** button
2. Select **App Store** → **Continue**
3. Select your App ID: `com.dropfly.pdfeditor`
4. Select your Distribution Certificate
5. Name it: "PDF Doc Sign App Store"
6. Download the profile (.mobileprovision file)

---

### Step 3: Get Your Team ID

1. Go to https://developer.apple.com/account
2. Click **Membership** in the sidebar
3. Copy your **Team ID** (e.g., `ABCD123456`)

---

### Step 4: Configure GitHub Secrets (10 minutes)

1. Go to your GitHub repo
2. Settings → Secrets and variables → Actions
3. Click **New repository secret** for each:

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `IOS_CERTIFICATE_P12` | Base64 of .p12 file | Run: `base64 -i YourCert.p12 \| pbcopy` |
| `IOS_CERTIFICATE_PASSWORD` | Your P12 password | The password you set in Step 2.3 |
| `IOS_PROVISIONING_PROFILE` | Base64 of profile | Run: `base64 -i YourProfile.mobileprovision \| pbcopy` |

**Commands to encode files:**
```bash
# Encode certificate (copies to clipboard)
base64 -i /path/to/your-certificate.p12 | pbcopy

# Encode provisioning profile (copies to clipboard)
base64 -i /path/to/your-profile.mobileprovision | pbcopy
```

Then paste from clipboard into GitHub secrets.

---

### Step 5: Update Export Options (2 minutes)

Edit `ios/App/exportOptions.plist`:

Replace:
- `YOUR_TEAM_ID` with your actual Team ID (from Step 3)
- `YOUR_PROVISIONING_PROFILE_NAME` with the exact name of your provisioning profile (from Step 2.4)

```xml
<key>teamID</key>
<string>ABCD123456</string>  <!-- Your actual Team ID -->
<key>provisioningProfiles</key>
<dict>
    <key>com.dropfly.pdfeditor</key>
    <string>PDF Doc Sign App Store</string>  <!-- Your actual profile name -->
</dict>
```

---

### Step 6: Build the App (5 minutes)

**Option A: Automatic Build (on every push)**
```bash
git add .
git commit -m "Configure iOS build"
git push
```
- GitHub Actions will automatically start building
- Wait ~10-15 minutes

**Option B: Manual Build**
1. Go to GitHub repo → **Actions** tab
2. Click **Build iOS App** workflow
3. Click **Run workflow** button
4. Select branch: `main`
5. Click **Run workflow**

---

### Step 7: Download the IPA File

1. Once the build completes (green checkmark ✅)
2. Click on the workflow run
3. Scroll down to **Artifacts**
4. Download **PDF-Doc-Sign-iOS.zip**
5. Unzip to get the `.ipa` file

---

### Step 8: Create App in App Store Connect (15 minutes)

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** button → **New App**
3. Fill in details:
   - **Platforms**: iOS
   - **Name**: PDF Doc Sign
   - **Primary Language**: English
   - **Bundle ID**: com.dropfly.pdfeditor (select from dropdown)
   - **SKU**: pdfeditor001 (any unique identifier)
   - **User Access**: Full Access
4. Click **Create**

---

### Step 9: Upload IPA to App Store

**Method 1: Using Transporter App (Easiest)**
1. Download **Transporter** from Mac App Store
2. Open Transporter
3. Sign in with Apple ID
4. Drag and drop your `.ipa` file
5. Click **Deliver**
6. Wait for processing (~5-10 minutes)

**Method 2: Using Command Line**
```bash
xcrun altool --upload-app \
  --type ios \
  --file /path/to/your-app.ipa \
  --username "your-apple-id@email.com" \
  --password "your-app-specific-password"
```

---

### Step 10: Submit for Review (30 minutes)

1. In App Store Connect, go to your app
2. Click on the version (e.g., 1.0)
3. Fill in all required information:
   - **App Information**: Category, content rating, etc.
   - **Pricing**: Select territories and pricing
   - **App Privacy**: Answer privacy questions
   - **Screenshots**: Add iOS screenshots (required sizes)
   - **Description**: Write app description
   - **Keywords**: PDF, editor, signature, forms
   - **Support URL**: Your website
   - **Marketing URL**: (optional)
4. Under **Build**, click **+** and select your uploaded build
5. Click **Add for Review**
6. Click **Submit to App Review**

---

## 📸 Screenshot Requirements

You need screenshots for these sizes:
- **6.7" Display** (iPhone 14 Pro Max): 1290 x 2796 pixels
- **5.5" Display** (iPhone 8 Plus): 1242 x 2208 pixels

**Quick way to get screenshots:**
1. Open Safari on iPhone
2. Go to http://localhost:3030 (or deployed URL)
3. Add to Home Screen
4. Open app and take screenshots
5. AirDrop to Mac

---

## 🔄 Future Updates

When you make changes:
1. Update version in `ios/App/App/Info.plist`
2. Commit and push to GitHub
3. GitHub Actions builds automatically
4. Download new IPA
5. Upload to App Store Connect
6. Submit new version for review

---

## ⚠️ Troubleshooting

### Build Fails with "Code signing error"
- Check GitHub secrets are correctly set
- Verify Team ID in exportOptions.plist
- Ensure provisioning profile matches bundle ID

### "No matching provisioning profiles found"
- Make sure bundle ID matches exactly: `com.dropfly.pdfeditor`
- Verify provisioning profile is for App Store distribution
- Check profile hasn't expired

### Build succeeds but IPA won't upload
- Verify you're using an App Store provisioning profile (not Development)
- Check bundle ID matches in App Store Connect
- Try uploading with Transporter instead of command line

---

## 📞 Need Help?

Common issues and solutions:
- **Certificate expired**: Create new certificate and update GitHub secret
- **Profile expired**: Create new profile and update GitHub secret
- **Wrong bundle ID**: Update in capacitor.config.ts and rebuild
- **Build timeout**: GitHub Actions sometimes slow, just retry the workflow

---

## 🎉 Success Checklist

- [ ] GitHub repo created and code pushed
- [ ] Apple Developer account set up
- [ ] App ID created (com.dropfly.pdfeditor)
- [ ] Distribution certificate created and exported as P12
- [ ] Provisioning profile created
- [ ] GitHub secrets configured (all 3)
- [ ] exportOptions.plist updated with Team ID
- [ ] GitHub Actions build completed successfully
- [ ] IPA file downloaded
- [ ] App created in App Store Connect
- [ ] IPA uploaded via Transporter
- [ ] App information filled out
- [ ] Screenshots added
- [ ] App submitted for review

---

**Estimated Total Time**: 2-3 hours for first-time setup

**Review Time**: Apple typically reviews within 24-48 hours

Good luck! 🚀
