# Mobile Testing Flow

## Overview
Process for testing CodeNomad on real mobile devices via Tailscale.

## Prerequisites

1. **Tailscale installed** on development machine
2. **Tailscale app** on mobile device(s)
3. **Both devices** logged into same Tailscale account
4. **Dev server** configured to accept external connections

## Setup (One-Time)

### 1. Configure Vite for External Access

In `packages/ui/vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    host: '0.0.0.0',  // Accept connections from any IP
    port: 5173
  }
});
```

### 2. Get Tailscale IP

```bash
tailscale ip -4
# Returns something like: 100.x.x.x
```

### 3. Note the URL

Your mobile testing URL will be:
```
http://100.x.x.x:5173
```

## Testing Workflow

### Quick Test (Single Feature)

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Open on mobile**
   - Open browser on phone
   - Navigate to `http://[tailscale-ip]:5173`

3. **Test the feature**
   - Interact with the UI
   - Check responsive layout
   - Verify touch interactions

4. **Iterate**
   - Make changes in code
   - HMR updates automatically
   - Refresh mobile browser if needed

### Comprehensive Test

1. **Prepare test checklist**
   - List features/components to test
   - Note specific interactions to verify

2. **Test across viewports**
   - Portrait mode
   - Landscape mode
   - With keyboard open

3. **Test across devices** (if available)
   - iPhone (Safari)
   - Android (Chrome)
   - Tablet

4. **Document issues**
   - Screenshot problems
   - Note device/viewport
   - Describe expected vs actual

## Remote Debugging

### iOS Safari (via Mac)

1. On iPhone: Settings > Safari > Advanced > Web Inspector: ON
2. Connect iPhone to Mac via USB
3. On Mac: Safari > Develop > [iPhone name] > [Page]
4. DevTools opens for mobile page

### Android Chrome (via Computer)

1. On Android: Enable Developer Options > USB Debugging
2. Connect to computer via USB
3. On computer: Open `chrome://inspect`
4. Click "inspect" under your device's page
5. DevTools opens for mobile page

## Troubleshooting

### Can't Connect

1. **Check Tailscale status**
   ```bash
   tailscale status
   ```
   Both devices should be listed and online.

2. **Verify server binding**
   - Server must bind to `0.0.0.0`, not `localhost`
   - Check console output for listening address

3. **Check firewall**
   - Port 5173 must be accessible
   - Tailscale should handle most cases

### Connection Drops

- Tailscale connection may timeout
- Re-open Tailscale app on mobile
- Check both devices have internet

### Slow Performance

- Mobile debugging can be slower
- HMR may take longer over network
- Full refresh if HMR seems stuck

## Issue Documentation Template

When you find an issue:

```markdown
**Device**: iPhone 14 Pro, iOS 17, Safari
**Viewport**: 393x852 (portrait)
**Component**: session-list
**Issue**: List items too close together, hard to tap

**Steps**:
1. Open app on mobile
2. Go to session list
3. Try to tap a session

**Expected**: Can easily tap individual sessions
**Actual**: Often tap wrong session, targets too small

**Severity**: Major
```

## Handoff

After testing, if issues found:
1. Document all issues with template above
2. Prioritize by severity
3. Hand off to `web_developer` for fixes
4. Re-test after fixes applied
