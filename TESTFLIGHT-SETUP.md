# TestFlight Automated Deployment Setup

## ✅ What's Been Configured

### Fastlane Setup
- ✅ Created `ios/App/fastlane/Fastfile` with `beta` lane
- ✅ Created `ios/App/fastlane/Appfile` with app configuration
- ✅ Created `ios/App/exportOptions.plist` for app-store distribution
- ✅ Build number incremented to 15

### GitHub Actions Workflow
- ✅ Updated `.github/workflows/ios-build.yml` to use Fastlane
- ✅ Workflow triggers on push to main branch
- ✅ Workflow builds, archives, and uploads to TestFlight automatically
- ✅ Artifacts are saved to GitHub for manual download

## 🔑 Required GitHub Secrets

The following secrets must be configured in your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | How to Get It |
|------------|-------------|---------------|
| `APPLE_ID` | Your Apple ID email | Your iCloud email |
| `APP_SPECIFIC_PASSWORD` | App-specific password for Apple ID | Generate at appleid.apple.com |
| `ITC_TEAM_ID` | App Store Connect Team ID (optional) | Found in App Store Connect membership |
| `FASTLANE_SESSION` | Session cookie (optional) | Run `fastlane spaceauth -u your@email.com` |
| `MATCH_PASSWORD` | Certificate password (optional) | Only if using fastlane match |

### How to Generate App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to **Security** section
4. Under **App-Specific Passwords**, click **Generate Password**
5. Name it "GitHub Actions PDF Doc Sign"
6. Copy the generated password
7. Add it as `APP_SPECIFIC_PASSWORD` secret in GitHub

## 🚀 How to Deploy to TestFlight

### Automatic Deployment (Recommended)

Simply push your code to the main branch:

```bash
git add .
git commit -m "Deploy to TestFlight - Build 15"
git push origin main
```

GitHub Actions will automatically:
1. Build the Next.js app
2. Sync Capacitor
3. Install CocoaPods dependencies
4. Build the iOS app with Xcode
5. Archive and sign the app
6. Upload to TestFlight

### Monitor the Build

1. Go to https://github.com/dropflyai/pdfdocsign-ios/actions
2. Click on the latest workflow run
3. Watch the progress in real-time
4. Build takes approximately 15-20 minutes

### Manual Deployment (Local)

If you prefer to deploy manually from your Mac:

```bash
cd ios/App
fastlane beta
```

This requires:
- Xcode installed
- Apple Developer account configured in Xcode
- Fastlane installed (`gem install fastlane`)

## 📱 Testing in TestFlight

### After Successful Upload

1. Go to https://appstoreconnect.apple.com
2. Select **PDF Doc Sign** app
3. Go to **TestFlight** tab
4. Wait for "Processing" to complete (~10-15 minutes)
5. Once "Ready to Test", add yourself as internal tester
6. Install TestFlight app on your iPhone
7. Accept the test invitation
8. Install and test PDF Doc Sign

### Internal Testing

- Internal testers can be added immediately
- No review required for internal testing
- Up to 100 internal testers allowed
- Builds expire after 90 days

### External Testing (Optional)

- Requires App Store review (1-2 days)
- Up to 10,000 external testers
- Good for beta testing before release

## 🔧 Troubleshooting

### Build Fails: "Code signing error"

- Check that Xcode automatic signing is enabled
- Verify Team ID is correct: `G46B7YC46C`
- Make sure you're logged into Xcode with your Apple ID

### Build Fails: "No such file or directory - PDFDocSign.xcworkspace"

- Make sure you committed the workspace rename
- Try running `npx cap sync ios` locally first

### Upload Fails: "Authentication error"

- Verify `APPLE_ID` secret is your correct Apple ID email
- Verify `APP_SPECIFIC_PASSWORD` is a valid app-specific password
- Generate a new app-specific password if needed

### TestFlight Shows "Processing" for Too Long

- Normal processing takes 10-15 minutes
- If stuck for >1 hour, check App Store Connect for errors
- Look for email from Apple about any issues

## 📝 Next Steps

1. **Set up GitHub secrets** (see table above)
2. **Commit and push** to trigger automated build
3. **Monitor GitHub Actions** to ensure build succeeds
4. **Check App Store Connect** for TestFlight availability
5. **Install from TestFlight** and test form field filling

## 🎯 Current Build Info

- **App Name**: PDF Doc Sign
- **Bundle ID**: com.dropfly.pdfdocsign
- **Team ID**: G46B7YC46C
- **Current Build Number**: 15
- **Version**: 1.0

## 🔗 Useful Links

- **GitHub Repository**: https://github.com/dropflyai/pdfdocsign-ios
- **GitHub Actions**: https://github.com/dropflyai/pdfdocsign-ios/actions
- **App Store Connect**: https://appstoreconnect.apple.com
- **Apple ID Management**: https://appleid.apple.com
- **TestFlight**: https://testflight.apple.com

---

**Ready to deploy!** Just set up the GitHub secrets and push to trigger the build.
