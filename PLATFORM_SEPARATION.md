# Platform Separation Guide

This project uses **platform detection** to allow platform-specific code while maintaining a single codebase.

## Why This Approach?

- ✅ **No repetitive work**: One codebase for both web and iOS
- ✅ **Prevent breaking changes**: Platform-specific fixes won't affect the other platform
- ✅ **Easy maintenance**: Update shared code once, it works everywhere

## How to Use

### Import the platform utilities:

```typescript
import { isNative, isWeb, isIOS } from '@/lib/platform';
```

### Example 1: iOS-only code

```typescript
// This code ONLY runs in the iOS app
if (isNative()) {
  console.log('Running on iOS app');
  // iOS-specific fixes here
}
```

### Example 2: Web-only code

```typescript
// This code ONLY runs in the browser
if (isWeb()) {
  console.log('Running on web');
  // Web-specific features here
}
```

### Example 3: Different behavior per platform

```typescript
const handleClick = () => {
  if (isNative()) {
    // iOS behavior
    alert('iOS app clicked!');
  } else {
    // Web behavior
    console.log('Web clicked!');
  }
};
```

### Example 4: Conditional rendering

```typescript
return (
  <div>
    {isNative() && <MobileOnlyFeature />}
    {isWeb() && <WebOnlyFeature />}
    <SharedFeature /> {/* This shows on both platforms */}
  </div>
);
```

### Example 5: Different styles per platform

```typescript
<button
  className={isNative()
    ? "px-6 py-4 text-lg"  // Larger touch targets for mobile
    : "px-4 py-2 text-base" // Standard size for web
  }
>
  Click me
</button>
```

## Real-World Use Cases

### Touch Handlers (iOS only)

```typescript
useEffect(() => {
  if (!isNative()) return; // Skip touch handlers on web

  const handleTouch = (e: TouchEvent) => {
    // iOS-specific touch handling
  };

  element.addEventListener('touchstart', handleTouch);
  return () => element.removeEventListener('touchstart', handleTouch);
}, []);
```

### File Upload (Different UI per platform)

```typescript
return (
  <div>
    {isNative() ? (
      // iOS: Show camera + photo library options
      <MobileFileUpload />
    ) : (
      // Web: Show standard file input
      <input type="file" accept="application/pdf" />
    )}
  </div>
);
```

## Best Practices

1. **Keep shared code outside conditionals**
   - Most code should work on both platforms
   - Only wrap platform-specific code

2. **Test on both platforms**
   - Web: `npm run dev` → http://localhost:3000
   - iOS: `npm run build:mobile` → Open in Xcode

3. **Document platform-specific code**
   ```typescript
   // iOS-only: Fix for touch event conflicts
   if (isNative()) {
     // ...
   }
   ```

4. **Prefer feature detection over platform detection when possible**
   - Instead of: `if (isNative()) { enableTouchEvents() }`
   - Better: `if ('ontouchstart' in window) { enableTouchEvents() }`

## Testing

- **Web testing**: Run `npm run dev` and test at http://localhost:3000
- **iOS testing**: Run `npm run build:mobile`, then test in simulator/device
- Platform detection returns `'web'` when running in browser, `'ios'` when in iOS app

## Common Pitfalls

❌ **Don't do this:**
```typescript
// BAD: Duplicating entire components
if (isNative()) {
  return <PDFEditorMobile />;
} else {
  return <PDFEditorWeb />;
}
```

✅ **Do this instead:**
```typescript
// GOOD: One component with platform-specific tweaks
return (
  <PDFEditor
    touchEnabled={isNative()}
    showFileInput={isWeb()}
  />
);
```
