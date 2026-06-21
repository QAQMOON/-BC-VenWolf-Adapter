# BC VenWolf Adapter

Tampermonkey userscript for connecting Bondage Club activity events to VenWolf.

It listens inside the Bondage Club page, maps BC activities to VenWolf Game API calls, and broadcasts to all connected DG-Lab/Coyote clients by default.

## What It Does

- Runs in Bondage Club through Tampermonkey.
- Listens for BC activity, shock, Portal Panties, and selected item state events.
- Converts matched events into VenWolf fire actions.
- Calls:

```text
POST /api/v2/game/all/action/fire
```

Default target is `clientId=all`, so VenWolf broadcasts to all connected clients.

## Requirements

VenWolf must be running and configured to allow broadcast:

```yaml
host: "0.0.0.0"
port: 8920
allowBroadcastToClients: true
```

## Install

1. Install Tampermonkey or Violentmonkey.
2. Install the production script:
   `https://github.com/QAQMOON/-BC-VenWolf-Adapter/raw/main/bc-venwolf-adapter.user.js`
3. Start VenWolf.
4. Connect one or more DG-Lab/Coyote clients in VenWolf.
5. Open Bondage Club and enter a room.
6. Run:

```text
/vw status
/vw test 20 3000
```

## Install Page

This repository includes a GitHub Pages install page in `index.html`.

After enabling GitHub Pages for branch `main` and folder `/root`, open:

```text
https://qaqmoon.github.io/-BC-VenWolf-Adapter/
```

## Automatic Updates

The userscript includes `@updateURL` and `@downloadURL`, both pointing to the raw script on GitHub:

```text
https://raw.githubusercontent.com/QAQMOON/-BC-VenWolf-Adapter/main/bc-venwolf-adapter.user.js
```

When publishing a new version, update both:

- `@version` in the userscript metadata.
- `const VERSION` inside the script.

Then push to GitHub. Userscript managers use the version number to decide whether to update.

## Commands

```text
/vw status
/vw help
/vw on
/vw off
/vw url http://127.0.0.1:8920
/vw client all
/vw client <clientId>
/vw max <1-200>
/vw duration <ms>
/vw maxduration <ms>
/vw cooldown <ms>
/vw pulse <pulseId>
/vw pulse clear
/vw override on|off
/vw onother on|off
/vw dry on|off
/vw test [strength] [ms]
```

## Safe Test Flow

Use dry-run mode first:

```text
/vw dry on
```

Trigger BC activities and check the local BC messages/browser console. Then enable real requests:

```text
/vw dry off
/vw test 20 3000
```

## Defaults

- VenWolf URL: `http://127.0.0.1:8920`
- Client ID: `all`
- Max fire strength: `60`
- Max duration: `30000ms`
- Cooldown: `900ms`
- Override repeated fire action: `true`

## Notes

This adapter does not control BC characters from VenWolf. It is a one-way bridge:

```text
BC behavior -> VenWolf API -> DG-Lab/Coyote clients
```

The script uses `GM_xmlhttpRequest` to avoid browser CORS blocking requests from the BC page to a local VenWolf server.
